// You'll set this 'JWT_SECRET' in your Worker's Settings -> Variables

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const cookieHeader = request.headers.get("Cookie") || "";

        // 1. Extract the JWT from your cookie string
        // Assumes your cookie is named 'token' (e.g., token=xxxxx.yyyyy.zzzzz)
        const match = cookieHeader.match(/access_token_cookie="?([^;"]+)"?/);
        const token = match ? match[1] : null;

        if (!token) {
            return new Response("Unauthorized: No token found", { status: 401 });
        }

        try {
            // 2. Validate the JWT (Self-contained check)
            // This is where you verify the signature and expiry
            const isValid = await verifyJWT(token, env.JWT_SECRET);

            if (!isValid) {
                return new Response("Unauthorized: Invalid or Expired Token", { status: 403 });
            }

            // 3. Fetch from R2 if valid
            const key = url.pathname.slice(1);
            const object = await env.MY_BUCKET.get(key);

            if (object === null) {
                return new Response("Object Not Found", { status: 404 });
            }

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("etag", object.httpEtag);
            return new Response(object.body, { headers });

        } catch (e) {
            return new Response("Internal Error", { status: 500 });
        }
    }
};

// Simplified helper for HS256 verification (using Web Crypto API)
async function verifyJWT(token, secret) {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    // Import the secret key
    const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false, ["verify"]
    );

    // Verify the signature (base64url to Uint8Array)
    const signature = base64UrlToUint8Array(signatureB64);
    const verified = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!verified) return false;

    // Check Expiry (exp)
    try {
        const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadB64)));
        if (payload.exp && Date.now() / 1000 > payload.exp) return false;
    } catch (e) {
        return false;
    }

    return true;
}

function base64UrlToUint8Array(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}