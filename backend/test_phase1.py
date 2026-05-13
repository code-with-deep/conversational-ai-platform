"""Phase 1 comprehensive API test — run with: python test_phase1.py"""
import httpx

BASE = "http://127.0.0.1:8000/api"


def main():
    print("=" * 60)
    print("PHASE 1 - FULL API TEST SUITE")
    print("=" * 60)

    # 1. Health
    r = httpx.get(f"{BASE}/health")
    print(f"\n[1] HEALTH CHECK: {r.status_code}")
    print(f"    {r.json()}")
    assert r.status_code == 200

    # 2. Register
    r = httpx.post(f"{BASE}/auth/register", json={
        "email": "dev@example.com",
        "username": "devuser",
        "password": "MySecure#Pass99",
        "full_name": "Dev User",
    })
    print(f"\n[2] REGISTER: {r.status_code}")
    user = r.json()
    if r.status_code != 201:
        print(f"    FAILED: {user.get('detail', 'Unknown error')}")
        print("    Tip: If you've run this test before, delete 'data/memory_chat.db' and try again.")
        return
    
    print(f"    User ID: {user['id']}")
    print(f"    Username: {user['username']}, Role: {user['role']}")
    assert r.status_code == 201

    # 3. Duplicate register
    r = httpx.post(f"{BASE}/auth/register", json={
        "email": "dev@example.com",
        "username": "other",
        "password": "Whatever123",
    })
    print(f"\n[3] DUPLICATE EMAIL: {r.status_code} (expected 409)")
    print(f"    Detail: {r.json()['detail']}")
    assert r.status_code == 409

    # 4. Login
    r = httpx.post(f"{BASE}/auth/login", json={
        "email": "dev@example.com",
        "password": "MySecure#Pass99",
    })
    print(f"\n[4] LOGIN: {r.status_code}")
    tokens = r.json()
    print(f"    Access: {tokens['access_token'][:40]}...")
    print(f"    Type: {tokens['token_type']}")
    assert r.status_code == 200
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]
    headers = {"Authorization": f"Bearer {access}"}

    # 5. Wrong password
    r = httpx.post(f"{BASE}/auth/login", json={
        "email": "dev@example.com",
        "password": "WrongOne",
    })
    print(f"\n[5] BAD PASSWORD: {r.status_code} (expected 401)")
    assert r.status_code == 401

    # 6. Current user
    r = httpx.get(f"{BASE}/auth/me", headers=headers)
    print(f"\n[6] GET /auth/me: {r.status_code}")
    me = r.json()
    print(f"    Email: {me['email']}, Name: {me['full_name']}")
    assert r.status_code == 200

    # 7. Update profile
    r = httpx.put(f"{BASE}/users/profile", headers=headers, json={
        "full_name": "Senior Dev",
        "preferences": {"theme": "dark"},
    })
    print(f"\n[7] UPDATE PROFILE: {r.status_code}")
    print(f"    Name: {r.json()['full_name']}, Prefs: {r.json()['preferences']}")
    assert r.status_code == 200

    # 8. List personas
    r = httpx.get(f"{BASE}/personas/", headers=headers)
    personas = r.json()
    print(f"\n[8] LIST PERSONAS: {r.status_code} ({len(personas)} found)")
    for p in personas:
        print(f"    - {p['name']:20s} | {p['domain']:10s} | mem: {p['default_memory']:8s} | builtin: {p['is_builtin']}")
    assert len(personas) == 5

    # 9. Create custom persona
    r = httpx.post(f"{BASE}/personas/", headers=headers, json={
        "name": "Data Science Mentor",
        "system_prompt": "You are an experienced data scientist who explains ML concepts clearly with real datasets.",
        "personality": "Analytical and patient",
        "domain": "technical",
        "default_memory": "entity",
        "temperature": 0.4,
    })
    print(f"\n[9] CREATE CUSTOM PERSONA: {r.status_code}")
    custom = r.json()
    print(f"    Name: {custom['name']}, Builtin: {custom['is_builtin']}")
    assert r.status_code == 201
    assert custom["is_builtin"] is False

    # 10. Cannot delete builtin
    builtin_id = personas[0]["id"]
    r = httpx.delete(f"{BASE}/personas/{builtin_id}", headers=headers)
    print(f"\n[10] DELETE BUILTIN: {r.status_code} (expected 400)")
    print(f"     Detail: {r.json()['detail']}")
    assert r.status_code == 400

    # 11. Can delete custom
    r = httpx.delete(f"{BASE}/personas/{custom['id']}", headers=headers)
    print(f"\n[11] DELETE CUSTOM PERSONA: {r.status_code}")
    print(f"     {r.json()['message']}")
    assert r.status_code == 200

    # 12. Create conversation with Code Helper
    code_helper = [p for p in personas if p["name"] == "Code Helper"][0]
    r = httpx.post(f"{BASE}/conversations/", headers=headers, json={
        "title": "Project Alpha Planning",
        "persona_id": code_helper["id"],
        "memory_type": "entity",
    })
    print(f"\n[12] CREATE CONVERSATION: {r.status_code}")
    conv1 = r.json()
    print(f"     ID: {conv1['id']}")
    print(f"     Title: {conv1['title']}, Memory: {conv1['memory_type']}")
    assert r.status_code == 201

    # 13. Create second conversation
    r = httpx.post(f"{BASE}/conversations/", headers=headers, json={
        "title": "Creative Writing Session",
        "memory_type": "kg",
    })
    conv2 = r.json()
    print(f"\n[13] CREATE CONV 2: {r.status_code} - {conv2['title']}")
    assert r.status_code == 201

    # 14. List conversations
    r = httpx.get(f"{BASE}/conversations/", headers=headers)
    print(f"\n[14] LIST CONVERSATIONS: {r.status_code}")
    data = r.json()
    print(f"     Total: {data['meta']['total']}, Page: {data['meta']['page']}/{data['meta']['pages']}")
    assert data["meta"]["total"] == 2

    # 15. Search
    r = httpx.get(f"{BASE}/conversations/", headers=headers, params={"search": "Alpha"})
    print(f"\n[15] SEARCH 'Alpha': {r.status_code}")
    print(f"     Found: {r.json()['meta']['total']}")
    assert r.json()["meta"]["total"] == 1

    # 16. Get detail
    r = httpx.get(f"{BASE}/conversations/{conv1['id']}", headers=headers)
    print(f"\n[16] GET DETAIL: {r.status_code}")
    detail = r.json()
    print(f"     Messages: {len(detail['messages'])}, Entities: {detail['entity_count']}, Triples: {detail['triple_count']}")
    assert r.status_code == 200

    # 17. Update (pin + rename)
    r = httpx.put(f"{BASE}/conversations/{conv1['id']}", headers=headers, json={
        "title": "Alpha Sprint 1",
        "is_pinned": True,
    })
    print(f"\n[17] UPDATE CONV: {r.status_code}")
    print(f"     Title: {r.json()['title']}, Pinned: {r.json()['is_pinned']}")
    assert r.json()["is_pinned"] is True

    # 18. Filter pinned
    r = httpx.get(f"{BASE}/conversations/", headers=headers, params={"pinned": "true"})
    print(f"\n[18] PINNED ONLY: {r.status_code}")
    print(f"     Count: {r.json()['meta']['total']}")
    assert r.json()["meta"]["total"] == 1

    # 19. Refresh tokens
    r = httpx.post(f"{BASE}/auth/refresh", json={"refresh_token": refresh})
    print(f"\n[19] REFRESH: {r.status_code}")
    new_tokens = r.json()
    print(f"     New access: {new_tokens['access_token'][:40]}...")
    assert r.status_code == 200

    # 20. Old refresh revoked
    r = httpx.post(f"{BASE}/auth/refresh", json={"refresh_token": refresh})
    print(f"\n[20] REUSE OLD REFRESH: {r.status_code} (expected 401)")
    assert r.status_code == 401

    # 21. Delete conversation
    r = httpx.delete(f"{BASE}/conversations/{conv2['id']}", headers=headers)
    print(f"\n[21] DELETE CONV: {r.status_code} - {r.json()['message']}")
    assert r.status_code == 200

    # 22. Verify deletion
    r = httpx.get(f"{BASE}/conversations/{conv2['id']}", headers=headers)
    print(f"\n[22] GET DELETED: {r.status_code} (expected 404)")
    assert r.status_code == 404

    # 23. Logout
    r = httpx.post(f"{BASE}/auth/logout", json={"refresh_token": new_tokens["refresh_token"]})
    print(f"\n[23] LOGOUT: {r.status_code} - {r.json()['message']}")
    assert r.status_code == 200

    # 24. No token
    r = httpx.get(f"{BASE}/conversations/")
    print(f"\n[24] NO AUTH: {r.status_code} (expected 401/403)")
    assert r.status_code in [401, 403]

    print("\n" + "=" * 60)
    print("ALL 24 TESTS PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()
