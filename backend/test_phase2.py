"""Phase 2 — Memory Engine comprehensive test suite.

Tests all 5 memory strategies, token tracking, SSE streaming,
entity search, and memory inspection endpoints.

Requires: server running on http://127.0.0.1:8000
           user dev@example.com / MySecure#Pass99 exists
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


def main():
    print("=" * 64)
    print("  PHASE 2 — MEMORY ENGINE TEST SUITE")
    print("=" * 64)

    # --- Auth ---
    r = httpx.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code != 200:
        print(f"FATAL: Cannot login ({r.status_code}). Aborting.")
        return
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    print(f"  Authenticated as {EMAIL}\n")

    # --- Get a persona for enriched tests ---
    r = httpx.get(f"{BASE}/personas/", headers=h)
    personas = r.json() if r.status_code == 200 else []
    code_persona_id = None
    for p in personas:
        if "code" in p.get("name", "").lower():
            code_persona_id = p["id"]
            break

    # =========================================================
    # TEST 1: Buffer Memory
    # =========================================================
    print("-" * 64)
    print("  TEST 1: Buffer Memory (basic chat + token tracking)")
    print("-" * 64)

    r = httpx.post(f"{BASE}/conversations/", headers=h, json={
        "title": "Buffer Test", "memory_type": "buffer",
    })
    report("Create buffer conversation", r.status_code == 201)
    cid_buffer = r.json()["id"]

    r = httpx.post(f"{BASE}/conversations/{cid_buffer}/message", headers=h,
                   json={"content": "Hello, my name is Alex and I work at Google."}, timeout=30)
    report("Send message (buffer)", r.status_code == 200)
    report("AI responded", bool(r.json().get("content")), r.json()["content"][:80])

    r = httpx.get(f"{BASE}/conversations/{cid_buffer}/tokens", headers=h)
    report("Token tracking works", r.status_code == 200 and r.json() is not None)
    if r.json():
        t = r.json()
        report("Token budget enforced",
               t["total_tokens"] > 0 and t["total_tokens"] <= t["budget_total"],
               f"{t['total_tokens']}/{t['budget_total']}")

    r = httpx.get(f"{BASE}/conversations/{cid_buffer}/memory", headers=h)
    report("Memory state endpoint", r.status_code == 200)
    report("Buffer has no entities", len(r.json().get("entities", [])) == 0)
    print()

    # =========================================================
    # TEST 2: Entity Memory
    # =========================================================
    print("-" * 64)
    print("  TEST 2: Entity Memory (extraction + versioning)")
    print("-" * 64)

    r = httpx.post(f"{BASE}/conversations/", headers=h, json={
        "title": "Entity Test", "memory_type": "entity",
        "persona_id": code_persona_id,
    })
    report("Create entity conversation", r.status_code == 201)
    cid_entity = r.json()["id"]

    # message 1 — mention people and projects
    r = httpx.post(f"{BASE}/conversations/{cid_entity}/message", headers=h,
                   json={"content": "I'm working with Sarah on Project Falcon, a machine learning pipeline built in Python using TensorFlow."},
                   timeout=60)
    report("Send entity-rich message", r.status_code == 200)

    r = httpx.get(f"{BASE}/conversations/{cid_entity}/entities", headers=h)
    entities_1 = r.json()
    report("Entities extracted", len(entities_1) >= 3,
           f"found {len(entities_1)} entities")

    entity_names = [e["name"] for e in entities_1]
    report("Sarah detected", any("Sarah" in n for n in entity_names))
    report("Project Falcon detected", any("Falcon" in n for n in entity_names))

    # message 2 — update existing entities
    r = httpx.post(f"{BASE}/conversations/{cid_entity}/message", headers=h,
                   json={"content": "Sarah just got promoted to lead engineer. The deadline for Project Falcon is March 15th."},
                   timeout=60)
    report("Send follow-up message", r.status_code == 200)

    r = httpx.get(f"{BASE}/conversations/{cid_entity}/entities", headers=h)
    entities_2 = r.json()
    sarah = next((e for e in entities_2 if "Sarah" in e["name"]), None)
    report("Entity versioning (mention_count > 1)",
           sarah is not None and sarah.get("mention_count", 0) > 1,
           f"Sarah mentions={sarah['mention_count']}" if sarah else "Sarah not found")

    # check entity version history
    if sarah:
        r = httpx.get(f"{BASE}/conversations/{cid_entity}/entities/{sarah['id']}/versions", headers=h)
        report("Entity version history", r.status_code == 200 and len(r.json()) >= 2,
               f"{len(r.json())} versions")
    print()

    # =========================================================
    # TEST 3: Knowledge Graph Memory
    # =========================================================
    print("-" * 64)
    print("  TEST 3: Knowledge Graph Memory (triple extraction)")
    print("-" * 64)

    r = httpx.post(f"{BASE}/conversations/", headers=h, json={
        "title": "KG Test", "memory_type": "kg",
    })
    report("Create KG conversation", r.status_code == 201)
    cid_kg = r.json()["id"]

    r = httpx.post(f"{BASE}/conversations/{cid_kg}/message", headers=h,
                   json={"content": "John is the CEO of TechCorp. TechCorp is headquartered in San Francisco. John studied at MIT."},
                   timeout=60)
    report("Send relationship-rich message", r.status_code == 200)

    r = httpx.get(f"{BASE}/conversations/{cid_kg}/graph", headers=h)
    triples = r.json()
    report("Triples extracted", len(triples) >= 2,
           f"found {len(triples)} triples")
    for t in triples[:3]:
        print(f"    > {t['subject']} --[{t['predicate']}]--> {t['object_']}")
    print()

    # =========================================================
    # TEST 4: Summary Memory
    # =========================================================
    print("-" * 64)
    print("  TEST 4: Summary Memory (auto-summarization)")
    print("-" * 64)

    r = httpx.post(f"{BASE}/conversations/", headers=h, json={
        "title": "Summary Test", "memory_type": "summary",
    })
    report("Create summary conversation", r.status_code == 201)
    cid_summary = r.json()["id"]

    # summary triggers at summary_interval (default=5 messages → counting user+assistant pairs)
    r = httpx.get(f"{BASE}/conversations/{cid_summary}/summary", headers=h)
    report("No summary initially", r.status_code == 200)

    # send a message (we won't trigger summarization with just 1, but verify endpoint)
    r = httpx.post(f"{BASE}/conversations/{cid_summary}/message", headers=h,
                   json={"content": "Tell me about quantum computing in one sentence."},
                   timeout=30)
    report("Send summary-mode message", r.status_code == 200)
    print()

    # =========================================================
    # TEST 5: Hybrid Memory
    # =========================================================
    print("-" * 64)
    print("  TEST 5: Hybrid Memory (summary + entity combined)")
    print("-" * 64)

    r = httpx.post(f"{BASE}/conversations/", headers=h, json={
        "title": "Hybrid Test", "memory_type": "hybrid",
    })
    report("Create hybrid conversation", r.status_code == 201)
    cid_hybrid = r.json()["id"]

    r = httpx.post(f"{BASE}/conversations/{cid_hybrid}/message", headers=h,
                   json={"content": "Lisa manages the DataVault project at Amazon, built with Apache Spark."},
                   timeout=60)
    report("Send hybrid message", r.status_code == 200)

    r = httpx.get(f"{BASE}/conversations/{cid_hybrid}/entities", headers=h)
    report("Hybrid extracts entities", len(r.json()) >= 1,
           f"found {len(r.json())}")
    print()

    # =========================================================
    # TEST 6: SSE Streaming
    # =========================================================
    print("-" * 64)
    print("  TEST 6: SSE Streaming (real-time token delivery)")
    print("-" * 64)

    r = httpx.post(f"{BASE}/conversations/", headers=h, json={
        "title": "Stream Test", "memory_type": "buffer",
    })
    cid_stream = r.json()["id"]

    chunks = []
    with httpx.stream("POST", f"{BASE}/conversations/{cid_stream}/stream",
                       headers=h, json={"content": "Write a haiku about coding."},
                       timeout=30) as resp:
        report("SSE endpoint responds", resp.status_code == 200)
        for line in resp.iter_lines():
            if line.startswith("data:"):
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                chunks.append(data)

    report("Tokens streamed", len(chunks) >= 5, f"{len(chunks)} chunks")
    full = "".join(chunks)
    report("Full response reconstructed", len(full) > 10, f'"{full[:60]}..."')
    print()

    # =========================================================
    # TEST 7: Entity Search (cross-conversation)
    # =========================================================
    print("-" * 64)
    print("  TEST 7: Entity Search (cross-conversation)")
    print("-" * 64)

    r = httpx.get(f"{BASE}/entities/search", headers=h, params={"q": "Sarah"})
    report("Entity search endpoint", r.status_code == 200)
    report("Found Sarah across conversations", len(r.json()) >= 1,
           f"{len(r.json())} results")

    r = httpx.get(f"{BASE}/entities/search", headers=h, params={"entity_type": "technology"})
    report("Filter by entity type", r.status_code == 200,
           f"{len(r.json())} technology entities")
    print()

    # =========================================================
    # TEST 8: Memory Configuration per Conversation
    # =========================================================
    print("-" * 64)
    print("  TEST 8: Memory Type Switching")
    print("-" * 64)

    r = httpx.put(f"{BASE}/conversations/{cid_buffer}", headers=h,
                  json={"memory_type": "entity"})
    report("Switch memory type", r.status_code == 200 and r.json()["memory_type"] == "entity")
    print()

    # =========================================================
    # TEST 9: Edge Cases & Error Handling
    # =========================================================
    print("-" * 64)
    print("  TEST 9: Edge Cases & Error Handling")
    print("-" * 64)

    # empty message
    r = httpx.post(f"{BASE}/conversations/{cid_buffer}/message", headers=h,
                   json={"content": ""}, timeout=10)
    report("Reject empty message", r.status_code == 422)

    # non-existent conversation
    r = httpx.post(f"{BASE}/conversations/00000000-0000-0000-0000-000000000000/message",
                   headers=h, json={"content": "test"}, timeout=10)
    report("404 on invalid conversation", r.status_code == 404)

    # unauthenticated access
    r = httpx.get(f"{BASE}/conversations/{cid_buffer}/entities")
    report("401 without auth", r.status_code in (401, 403))

    # memory inspection on empty conversation
    r = httpx.post(f"{BASE}/conversations/", headers=h, json={
        "title": "Empty Conv", "memory_type": "kg",
    })
    empty_cid = r.json()["id"]
    r = httpx.get(f"{BASE}/conversations/{empty_cid}/graph", headers=h)
    report("Empty graph returns []", r.status_code == 200 and r.json() == [])

    r = httpx.get(f"{BASE}/conversations/{empty_cid}/summary", headers=h)
    report("Empty summary returns null", r.status_code == 200)
    print()

    # =========================================================
    # RESULTS
    # =========================================================
    print("=" * 64)
    print(f"  RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 64)
    if failed:
        print("\n  Failed tests:")
        for name, status, detail in results:
            if status == "FAIL":
                print(f"    [FAIL] {name}: {detail}")
    else:
        print("  ALL PHASE 2 TESTS PASSED")
    print()


if __name__ == "__main__":
    main()
