import requests
import logging

logger = logging.getLogger(__name__)

def forward_request(method: str, url: str, headers: dict, data: bytes):
    """
    Standard request forwarding function using 'requests' library.
    """
    try:
        # Standard HTTP forwarding
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            data=data,
            timeout=10,
            allow_redirects=False
        )
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Forwarding Error: {str(e)}")
        return None
