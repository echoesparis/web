# Create lib directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "lib"
New-Item -ItemType Directory -Force -Path "lib/examples/jsm/postprocessing"
New-Item -ItemType Directory -Force -Path "lib/examples/jsm/shaders"

# Download 3d-force-graph
Invoke-WebRequest -Uri "https://unpkg.com/3d-force-graph@1.74.3/dist/3d-force-graph.min.js" -OutFile "lib/3d-force-graph.min.js"

# Download Three.js core
Invoke-WebRequest -Uri "https://unpkg.com/three@0.162.0/build/three.module.js" -OutFile "lib/three.module.js"

# Download postprocessing files
Invoke-WebRequest -Uri "https://unpkg.com/three@0.162.0/examples/jsm/postprocessing/UnrealBloomPass.js" -OutFile "lib/examples/jsm/postprocessing/UnrealBloomPass.js"
Invoke-WebRequest -Uri "https://unpkg.com/three@0.162.0/examples/jsm/postprocessing/Pass.js" -OutFile "lib/examples/jsm/postprocessing/Pass.js"

# Download shader files
Invoke-WebRequest -Uri "https://unpkg.com/three@0.162.0/examples/jsm/shaders/CopyShader.js" -OutFile "lib/examples/jsm/shaders/CopyShader.js"
Invoke-WebRequest -Uri "https://unpkg.com/three@0.162.0/examples/jsm/shaders/LuminosityHighPassShader.js" -OutFile "lib/examples/jsm/shaders/LuminosityHighPassShader.js"

Write-Host "Dependencies downloaded successfully!"