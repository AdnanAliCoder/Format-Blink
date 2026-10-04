import sys
import modal

app = modal.App("format-blink-tools")

image = modal.Image.from_dockerfile(
    "processor/tools/Dockerfile",
    context_dir="processor/tools",
)

@app.function(
    image=image,
    cpu=1.0,
    memory=2048,
    timeout=600,
    min_containers=0,
    env={
        "ALLOWED_ORIGINS": "https://formatblink.vercel.app,https://formatblink.com,https://www.formatblink.com",
    },
)
@modal.asgi_app()
def tools_api():
    sys.path.insert(0, "/app")
    from server import app as web_app
    return web_app
