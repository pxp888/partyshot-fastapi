export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cookieHeader = request.headers.get("Cookie") || "";

        // 1. Extract the JWT from the access_token_cookie
        const match = cookieHeader.match(/access_token_cookie="?([^;"]+)"?/);
        const token = match ? match[1] : null;

        if (!token) {
            return new Response("Unauthorized: No token found", { status: 401 });
        }

        try {
            // 2. Validate the JWT signature and expiry
            const isValid = await verifyJWT(token, env.JWT_SECRET);

            if (!isValid) {
                return new Response("Unauthorized: Invalid or Expired Token", { status: 403 });
            }

            // 3. Cache Logic: Check if the Edge already has this file
            const cache = caches.default;
            let response = await cache.match(request);

            if (!response) {
                // Cache MISS: We must fetch from R2
                const key = url.pathname.slice(1);
                const object = await env.MY_BUCKET.get(key);

                if (object === null) {
                    return new Response("Object Not Found", { status: 404 });
                }

                // Construct headers from R2 metadata
                const headers = new Headers();
                object.writeHttpMetadata(headers);
                headers.set("etag", object.httpEtag);

                // Explicitly allow the CDN to cache this for 1 week (s-maxage)
                // and the browser to cache for 1 day (max-age)
                headers.set("Cache-Control", "public, s-maxage=604800, max-age=86400");

                // Create the response object
                response = new Response(object.body, { headers });

                // Store a clone of the response in the cache for future requests
                // ctx.waitUntil ensures the task finishes even after the response is sent
                ctx.waitUntil(cache.put(request, response.clone()));
            }

            return response;

        } catch (e) {
            return new Response(`Internal Error: ${e.message}`, { status: 500 });
        }
    }
};

/**
 * JWT Verification Logic (HS256)
 */
async function verifyJWT(token, secret) {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    try {
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        const signature = base64UrlToUint8Array(signatureB64);
        const verified = await crypto.subtle.verify("HMAC", key, signature, data);
        if (!verified) return false;

        // Verify Expiry
        const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadB64)));
        if (payload.exp && Date.now() / 1000 > payload.exp) return false;

        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Helper to convert Base64URL to Uint8Array
 */
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