"""Phase 3 -- LangGraph Orchestration comprehensive test suite.

Tests:
  1. Graph-based message flow (non-streaming) with buffer memory
  2. Graph-based message flow with entity memory + entity extraction
  3. Graph-based message flow with summary memory + summarization
  4. Graph-based message flow with KG memory + triple extraction
  5. Graph-based message flow with hybrid memory (parallel updates)
  6. SSE streaming via graph node pipeline
  7. Intent classification verification
  8. Memory comparison endpoint (POST /api/compare/memory)
  9. Export endpoint (POST /api/conversations/{id}/export)
 10. Token usage logging through graph pipeline

Requires: server running on http://127.0.0.1:8000
"""
import json
import time
import httpx

BASE = "http://127.0.0.1:8000/api"
EMAIL = "dev@example.com"
PASSWORD = "MySecure#Pass99"

passed = 0
failed = 0
results = []


def report(name: str, ok: bool, detail: str = ""):
    global passed, failed
    status = "PASS" if ok else "FAIL"
    if ok:
        passed += 1
    else:
        failed += 1
    results.append((name, status, detail))
    mark = "[PASS]" if ok else "[FAIL]"
    print(f"  {mark} {name}" + (f" -- {detail}" if detail else ""))


def create_conv(h, memory_type, title, persona_id=None):
    """Helper to create a conversation."""
    body = {"title": title, "memory_type": memory_type}
    if persona_id:
        body["persona_id"] = persona_id
    r = httpx.post(f"{BASE}/conversations/", json=body, headers=h)
    assert r.status_code == 201, f"Create conv failed: {r.status_code} {r.text}"
    return r.json()["id"]


def send_msg(h, conv_id, content, timeout=60):
    """Helper to send a non-streaming message."""
    r = httpx.post(
        f"{BASE}/conversations/{conv_id}/message",
        json={"content": content},
        headers=h,
        timeout=timeout,
    )
    return r


def stream_msg(h, conv_id, content, timeout=60):
    """Helper to send a streaming message and collect chunks."""
    chunks = []
    with httpx.stream(
        "POST",
        f"{BASE}/conversations/{conv_id}/stream",
        json={"content": content},
        headers=h,
        timeout=timeout,
    ) as response:
        for line in response.iter_lines():
            if line.startswith("data:"):
                data = line[len("data:"):].strip()
                if data == "[DONE]":
                    break
                chunks.append(data)
    return chunks


def main():
    print("=" * 64)
    print("  PHASE 3 -- LANGGRAPH ORCHESTRATION TEST SUITE")
    print("=" * 64)

    # ---------- Auth ----------
    r = httpx.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code != 200:
        # try registration first
        r2 = httpx.post(f"{BASE}/auth/register", json={
            "email": EMAIL, "password": PASSWORD, "username": "dev_tester",
        })
        if r2.status_code not in (200, 201):
            print(f"FATAL: Cannot register or login. Aborting.")
            return
        r = httpx.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        if r.status_code != 200:
            print(f"FATAL: Cannot login after register ({r.status_code}). Aborting.")
            return

    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    print(f"  Authenticated as {EMAIL}\n")

    # ==========================================================
    # TEST 1: Buffer Memory -- Graph Non-Streaming
    # ==========================================================
    print("-" * 64)
    print("  TEST 1: Buffer Memory - Graph Non-Streaming")
    print("-" * 64)

    conv_id = create_conv(h, "buffer", "P3 Buffer Test")
    report("1.1 Create buffer conversation", True)

    r = send_msg(h, conv_id, "Hello, I'm testing the LangGraph pipeline!")
    ok = r.status_code == 200
    report("1.2 Send message via graph", ok, f"status={r.status_code}")

    if ok:
        body = r.json()
        report("1.3 Response has content", bool(body.get("content")),
               f"len={len(body.get('content', ''))}")
        report("1.4 Response role is assistant", body.get("role") == "assistant")

    # verify token usage was logged
    r = httpx.get(f"{BASE}/conversations/{conv_id}/tokens", headers=h)
    report("1.5 Token usage logged", r.status_code == 200 and r.json() is not None,
           f"status={r.status_code}")

    # verify messages are persisted
    r = httpx.get(f"{BASE}/conversations/{conv_id}", headers=h)
    if r.status_code == 200:
        detail = r.json()
        msg_count = detail.get("message_count", 0)
        report("1.6 Messages persisted", msg_count >= 2, f"count={msg_count}")
    else:
        report("1.6 Messages persisted", False, f"status={r.status_code}")

    # ==========================================================
    # TEST 2: Entity Memory -- Graph + Entity Extraction
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 2: Entity Memory - Graph + Entity Extraction")
    print("-" * 64)

    conv_id = create_conv(h, "entity", "P3 Entity Test")
    report("2.1 Create entity conversation", True)

    r = send_msg(h, conv_id,
        "Sarah is a backend engineer at Google. She works on Project Atlas "
        "which uses Python and PostgreSQL. The deadline is March 15.")
    ok = r.status_code == 200
    report("2.2 Send entity-rich message", ok, f"status={r.status_code}")

    if ok:
        # wait a beat for memory updates to complete
        time.sleep(3)

        # check entities were extracted
        r = httpx.get(f"{BASE}/conversations/{conv_id}/entities", headers=h)
        if r.status_code == 200:
            entities = r.json()
            entity_names = [e["name"].lower() for e in entities]
            report("2.3 Entities extracted", len(entities) > 0,
                   f"found={[e['name'] for e in entities]}")
            report("2.4 Sarah entity found", any("sarah" in n for n in entity_names))
        else:
            report("2.3 Entities extracted", False, f"status={r.status_code}")
            report("2.4 Sarah entity found", False)

    # ==========================================================
    # TEST 3: Summary Memory -- Graph + Summarization
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 3: Summary Memory - Graph + Summarization")
    print("-" * 64)

    conv_id = create_conv(h, "summary", "P3 Summary Test")
    report("3.1 Create summary conversation", True)

    # send several messages to trigger summarization
    msgs = [
        "Let's discuss Python web frameworks. I use FastAPI for our backend.",
        "We also use SQLAlchemy 2.0 for database access with async support.",
        "The frontend is built with React and TypeScript.",
        "We deploy on AWS using Docker containers and ECS.",
        "Our CI/CD pipeline runs on GitHub Actions.",
    ]
    all_ok = True
    for i, msg in enumerate(msgs):
        r = send_msg(h, conv_id, msg)
        if r.status_code != 200:
            all_ok = False
            report(f"3.2 Send message {i+1}/5", False, f"status={r.status_code}")
            break
        time.sleep(0.5)

    if all_ok:
        report("3.2 Send 5 messages for summarization", True)

    # check summary exists
    time.sleep(3)
    r = httpx.get(f"{BASE}/conversations/{conv_id}/summary", headers=h)
    has_summary = r.status_code == 200 and r.json() is not None
    report("3.3 Summary generated", has_summary,
           f"status={r.status_code}, body={'present' if r.json() else 'null'}")

    # ==========================================================
    # TEST 4: KG Memory -- Graph + Triple Extraction
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 4: KG Memory - Graph + Triple Extraction")
    print("-" * 64)

    conv_id = create_conv(h, "kg", "P3 KG Test")
    report("4.1 Create KG conversation", True)

    r = send_msg(h, conv_id,
        "John works at Microsoft. He manages Project Falcon which uses "
        "React and deploys on Azure. The project started in January.")
    ok = r.status_code == 200
    report("4.2 Send KG-rich message", ok, f"status={r.status_code}")

    if ok:
        time.sleep(3)
        r = httpx.get(f"{BASE}/conversations/{conv_id}/graph", headers=h)
        if r.status_code == 200:
            triples = r.json()
            report("4.3 Triples extracted", len(triples) > 0,
                   f"count={len(triples)}")
            if triples:
                t = triples[0]
                report("4.4 Triple has subject/predicate/object",
                       all(k in t for k in ("subject", "predicate", "object")))
        else:
            report("4.3 Triples extracted", False, f"status={r.status_code}")
            report("4.4 Triple structure", False)

    # ==========================================================
    # TEST 5: Hybrid Memory -- Parallel Updates
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 5: Hybrid Memory - Parallel Updates")
    print("-" * 64)

    conv_id = create_conv(h, "hybrid", "P3 Hybrid Test")
    report("5.1 Create hybrid conversation", True)

    # send multiple messages for both summary + entity extraction
    hybrid_msgs = [
        "Alice is the CTO of TechCorp. She leads the AI division.",
        "Bob is a senior engineer reporting to Alice. He builds the NLP pipeline.",
        "The team uses LangGraph for workflow orchestration.",
        "Their project deadline is June 30th.",
        "They recently migrated from AWS to GCP.",
    ]
    for i, msg in enumerate(hybrid_msgs):
        r = send_msg(h, conv_id, msg)
        if r.status_code != 200:
            report(f"5.2 Hybrid messages", False, f"msg {i+1} failed: {r.status_code}")
            break
        time.sleep(0.5)
    else:
        report("5.2 Send 5 hybrid messages", True)

    time.sleep(3)

    # check both entities AND summary exist
    r_ent = httpx.get(f"{BASE}/conversations/{conv_id}/entities", headers=h)
    r_sum = httpx.get(f"{BASE}/conversations/{conv_id}/summary", headers=h)

    has_ents = r_ent.status_code == 200 and len(r_ent.json()) > 0
    has_sum = r_sum.status_code == 200 and r_sum.json() is not None

    report("5.3 Entities extracted (hybrid)", has_ents,
           f"count={len(r_ent.json()) if r_ent.status_code == 200 else 'N/A'}")
    report("5.4 Summary generated (hybrid)", has_sum)

    # ==========================================================
    # TEST 6: SSE Streaming
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 6: SSE Streaming via Graph Pipeline")
    print("-" * 64)

    conv_id = create_conv(h, "buffer", "P3 Streaming Test")
    report("6.1 Create streaming conversation", True)

    try:
        chunks = stream_msg(h, conv_id, "Tell me a short joke about programming.")
        report("6.2 Stream returns chunks", len(chunks) > 0,
               f"chunks={len(chunks)}")
        if chunks:
            full = "".join(chunks)
            report("6.3 Stream forms valid response", len(full) > 10,
                   f"len={len(full)}")
    except Exception as exc:
        report("6.2 Stream returns chunks", False, f"error={exc}")
        report("6.3 Stream forms valid response", False)

    # verify the streamed message was persisted
    r = httpx.get(f"{BASE}/conversations/{conv_id}", headers=h)
    if r.status_code == 200:
        detail = r.json()
        msg_count = detail.get("message_count", 0)
        report("6.4 Streamed message persisted", msg_count >= 2, f"count={msg_count}")
    else:
        report("6.4 Streamed message persisted", False)

    # ==========================================================
    # TEST 7: Memory Comparison Endpoint
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 7: Memory Comparison Endpoint")
    print("-" * 64)

    # use the entity conversation (has messages)
    # first get a conversation with messages
    r = httpx.get(f"{BASE}/conversations/", headers=h)
    compare_conv_id = None
    if r.status_code == 200:
        convs = r.json().get("data", [])
        for c in convs:
            if c.get("message_count", 0) >= 2:
                compare_conv_id = c["id"]
                break

    if compare_conv_id:
        r = httpx.post(
            f"{BASE}/compare/memory",
            json={
                "conversation_id": compare_conv_id,
                "strategy_a": "buffer",
                "strategy_b": "summary",
            },
            headers=h,
            timeout=60,
        )
        ok = r.status_code == 200
        report("7.1 Compare endpoint returns 200", ok, f"status={r.status_code}")
        if ok:
            data = r.json()
            report("7.2 Has result_a", "result_a" in data)
            report("7.3 Has result_b", "result_b" in data)
            report("7.4 result_a has response",
                   bool(data.get("result_a", {}).get("response")))
            report("7.5 result_a has token_usage",
                   bool(data.get("result_a", {}).get("token_usage")))
    else:
        report("7.1 Compare endpoint", False, "No conversation with messages found")

    # ==========================================================
    # TEST 8: Export Endpoint
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 8: Export Endpoint")
    print("-" * 64)

    if compare_conv_id:
        r = httpx.post(
            f"{BASE}/conversations/{compare_conv_id}/export",
            headers=h,
            timeout=30,
        )
        ok = r.status_code == 200
        report("8.1 Export endpoint returns 200", ok, f"status={r.status_code}")
        if ok:
            data = r.json()
            report("8.2 Export has conversation", "conversation" in data)
            report("8.3 Export has messages", "messages" in data and len(data["messages"]) > 0,
                   f"count={len(data.get('messages', []))}")
            report("8.4 Export has entities key", "entities" in data)
            report("8.5 Export has triples key", "triples" in data)
            report("8.6 Export has summaries key", "summaries" in data)
    else:
        report("8.1 Export endpoint", False, "No conversation to export")

    # ==========================================================
    # TEST 9: Multi-turn Conversation through Graph
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 9: Multi-turn Conversation Coherence")
    print("-" * 64)

    conv_id = create_conv(h, "entity", "P3 Multi-turn Test")
    report("9.1 Create multi-turn conversation", True)

    r1 = send_msg(h, conv_id, "My name is David and I work at Netflix.")
    ok1 = r1.status_code == 200
    report("9.2 First message", ok1)

    if ok1:
        r2 = send_msg(h, conv_id, "What company do I work at?")
        ok2 = r2.status_code == 200
        report("9.3 Recall question", ok2)
        if ok2:
            answer = r2.json().get("content", "").lower()
            report("9.4 Response mentions Netflix",
                   "netflix" in answer, f"response={answer[:100]}")

    # ==========================================================
    # TEST 10: Token Budget Accounting
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 10: Token Budget Accounting")
    print("-" * 64)

    r = httpx.get(f"{BASE}/conversations/{conv_id}/tokens", headers=h)
    if r.status_code == 200 and r.json():
        usage = r.json()
        report("10.1 Token log exists", True)
        report("10.2 Has system_tokens", "system_tokens" in usage)
        report("10.3 Has memory_tokens", "memory_tokens" in usage)
        report("10.4 Has recent_tokens", "recent_tokens" in usage)
        report("10.5 Has response_tokens", "response_tokens" in usage)
        report("10.6 Has budget_total", "budget_total" in usage)
        report("10.7 budget_total > 0", usage.get("budget_total", 0) > 0,
               f"budget={usage.get('budget_total')}")
    else:
        report("10.1 Token log exists", False, f"status={r.status_code}")

    # ==========================================================
    # TEST 11: Export & Import Cycle
    # ==========================================================
    print("\n" + "-" * 64)
    print("  TEST 11: Export & Import Cycle")
    print("-" * 64)

    # 1. Export the previous conversation
    r_exp = httpx.post(f"{BASE}/conversations/{conv_id}/export", headers=h)
    if r_exp.status_code == 200:
        export_data = r_exp.json()
        report("11.1 Export conversation", True)
        
        # 2. Import it as a new one
        r_imp = httpx.post(f"{BASE}/conversations/import", headers=h, json=export_data)
        if r_imp.status_code == 200:
            new_conv = r_imp.json()
            new_id = new_conv["id"]
            report("11.2 Import conversation", True, f"new_id={new_id}")
            
            # 3. Verify it has messages
            r_msg = httpx.get(f"{BASE}/conversations/{new_id}", headers=h)
            has_msgs = r_msg.status_code == 200 and len(r_msg.json().get("messages", [])) > 0
            report("11.3 Imported data check", has_msgs)
        else:
            report("11.2 Import conversation", False, f"status={r_imp.status_code}")
    else:
        report("11.1 Export conversation", False, f"status={r_exp.status_code}")

    # ==========================================================
    # SUMMARY
    # ==========================================================
    print("\n" + "=" * 64)
    print(f"  RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 64)

    if failed > 0:
        print("\n  Failed tests:")
        for name, status, detail in results:
            if status == "FAIL":
                print(f"    [FAIL] {name} -- {detail}")

    return failed == 0


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
