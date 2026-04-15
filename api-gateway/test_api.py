import requests
import json

base_url = "http://localhost:5001/api"

def test_add_to_cart():
    print("Logging in...")
    try:
        login_resp = requests.post(f"{base_url}/auth/login", json={
            "email": "testuser@example.com",
            "password": "Password123!"
        })
        login_resp.raise_for_status()
        token = login_resp.json().get("token")
        print(f"Token obtained: {token[:20]}...")

        print("Adding to cart...")
        headers = {"Authorization": f"Bearer {token}"}
        cart_resp = requests.post(f"{base_url}/cart/add", 
            json={"product_id": "aa2def79-4705-43e9-8fb6-d874accd20b0", "quantity": 1},
            headers=headers
        )
        print(f"Status: {cart_resp.status_code}")
        print(f"Response: {cart_resp.text}")
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response Body: {e.response.text}")

if __name__ == "__main__":
    test_add_to_cart()
