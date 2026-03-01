// You'll set this 'JWT_SECRET' in your Worker's Settings -> Variables
const JWT_SECRET = "AEd5zQKOkmHLReq6l4az8e0zq/8JHhAlgy+um+Y4MQKBgQDgbmepejE";

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
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!signatureB64) return false;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false, ["verify"]
    );

    // Check signature
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const verified = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!verified) return false;

    // Check Expiry (exp)
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;

    return true;
}