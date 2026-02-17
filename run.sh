podman run -d \
  --name fast1 \
  --network host \
  -p 8000:8000 \
  -v ./backend/env.py:/code/backend/env.py:Z \
  localhost/fast1
