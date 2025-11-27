import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const Ghost = () => {
    const containerRef = useRef(null);
    const requestRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 18; // Zoomed out slightly for sidebar

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: true,
            premultipliedAlpha: false,
            stencil: false,
            depth: true
        });
        renderer.setSize(width, height);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Post-processing
        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.3, 1.25, 0.0
        );
        composer.addPass(bloomPass);

        // Analog Decay Shader
        const analogDecayShader = {
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0.0 },
                uResolution: { value: new THREE.Vector2(width, height) },
                uAnalogGrain: { value: 0.4 },
                uAnalogBleeding: { value: 1.0 },
                uAnalogVSync: { value: 1.0 },
                uAnalogScanlines: { value: 1.0 },
                uAnalogVignette: { value: 1.0 },
                uAnalogJitter: { value: 0.4 },
                uAnalogIntensity: { value: 0.6 },
                uLimboMode: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uTime;
                uniform vec2 uResolution;
                uniform float uAnalogGrain;
                uniform float uAnalogBleeding;
                uniform float uAnalogVSync;
                uniform float uAnalogScanlines;
                uniform float uAnalogVignette;
                uniform float uAnalogJitter;
                uniform float uAnalogIntensity;
                uniform float uLimboMode;
                varying vec2 vUv;
                
                float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
                float random(float x) { return fract(sin(x) * 43758.5453123); }
                float gaussian(float z, float u, float o) { return (1.0 / (o * sqrt(2.0 * 3.1415))) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o)))); }
                vec3 grain(vec2 uv, float time, float intensity) {
                    float seed = dot(uv, vec2(12.9898, 78.233));
                    float noise = fract(sin(seed) * 43758.5453 + time * 2.0);
                    noise = gaussian(noise, 0.0, 0.5 * 0.5);
                    return vec3(noise) * intensity;
                }
                
                void main() {
                    vec2 uv = vUv;
                    float time = uTime * 1.8;
                    vec2 jitteredUV = uv;
                    if (uAnalogJitter > 0.01) {
                        float jitterAmount = (random(vec2(floor(time * 60.0))) - 0.5) * 0.003 * uAnalogJitter * uAnalogIntensity;
                        jitteredUV.x += jitterAmount;
                        jitteredUV.y += (random(vec2(floor(time * 30.0) + 1.0)) - 0.5) * 0.001 * uAnalogJitter * uAnalogIntensity;
                    }
                    if (uAnalogVSync > 0.01) {
                        float vsyncRoll = sin(time * 2.0 + uv.y * 100.0) * 0.02 * uAnalogVSync * uAnalogIntensity;
                        float vsyncChance = step(0.95, random(vec2(floor(time * 4.0))));
                        jitteredUV.y += vsyncRoll * vsyncChance;
                    }
                    vec4 color = texture2D(tDiffuse, jitteredUV);
                    if (uAnalogBleeding > 0.01) {
                        float bleedAmount = 0.012 * uAnalogBleeding * uAnalogIntensity;
                        float offsetPhase = time * 1.5 + uv.y * 20.0;
                        vec2 redOffset = vec2(sin(offsetPhase) * bleedAmount, 0.0);
                        vec2 blueOffset = vec2(-sin(offsetPhase * 1.1) * bleedAmount * 0.8, 0.0);
                        float r = texture2D(tDiffuse, jitteredUV + redOffset).r;
                        float g = texture2D(tDiffuse, jitteredUV).g;
                        float b = texture2D(tDiffuse, jitteredUV + blueOffset).b;
                        color = vec4(r, g, b, color.a);
                    }
                    if (uAnalogGrain > 0.01) {
                        vec3 grainEffect = grain(uv, time, 0.075 * uAnalogGrain * uAnalogIntensity);
                        grainEffect *= (1.0 - color.rgb);
                        color.rgb += grainEffect;
                    }
                    if (uAnalogScanlines > 0.01) {
                        float scanlineFreq = 600.0 + uAnalogScanlines * 400.0;
                        float scanlinePattern = sin(uv.y * scanlineFreq) * 0.5 + 0.5;
                        float scanlineIntensity = 0.1 * uAnalogScanlines * uAnalogIntensity;
                        color.rgb *= (1.0 - scanlinePattern * scanlineIntensity);
                    }
                    if (uAnalogVignette > 0.01) {
                        vec2 vignetteUV = (uv - 0.5) * 2.0;
                        float vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.3 * uAnalogVignette * uAnalogIntensity;
                        color.rgb *= vignette;
                    }
                    gl_FragColor = color;
                }
            `
        };

        const analogDecayPass = new ShaderPass(analogDecayShader);
        composer.addPass(analogDecayPass);
        composer.addPass(new OutputPass());

        // Ghost Setup
        const ghostGroup = new THREE.Group();
        scene.add(ghostGroup);

        const ghostGeometry = new THREE.SphereGeometry(2, 40, 40);
        const positions = ghostGeometry.getAttribute("position").array;
        for (let i = 0; i < positions.length; i += 3) {
            if (positions[i + 1] < -0.2) {
                const x = positions[i];
                const z = positions[i + 2];
                const noise = Math.sin(x * 5) * 0.35 + Math.cos(z * 4) * 0.25 + Math.sin((x + z) * 3) * 0.15;
                positions[i + 1] = -2.0 + noise;
            }
        }
        ghostGeometry.computeVertexNormals();

        const ghostMaterial = new THREE.MeshStandardMaterial({
            color: 0x0f2027,
            transparent: true,
            opacity: 0.88,
            emissive: 0xff4500, // Orange glow
            emissiveIntensity: 5.8,
            roughness: 0.02,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const ghostBody = new THREE.Mesh(ghostGeometry, ghostMaterial);
        ghostGroup.add(ghostBody);

        // Eyes
        const eyeGroup = new THREE.Group();
        ghostGroup.add(eyeGroup);
        const socketGeometry = new THREE.SphereGeometry(0.45, 16, 16);
        const socketMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftSocket = new THREE.Mesh(socketGeometry, socketMaterial);
        leftSocket.position.set(-0.7, 0.6, 1.9);
        leftSocket.scale.set(1.1, 1.0, 0.6);
        eyeGroup.add(leftSocket);

        const rightSocket = new THREE.Mesh(socketGeometry, socketMaterial);
        rightSocket.position.set(0.7, 0.6, 1.9);
        rightSocket.scale.set(1.1, 1.0, 0.6);
        eyeGroup.add(rightSocket);

        const eyeGeometry = new THREE.SphereGeometry(0.3, 12, 12);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 1 }); // Green eyes

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.7, 0.6, 2.0);
        eyeGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.7, 0.6, 2.0);
        eyeGroup.add(rightEye);

        // Lighting
        const rimLight1 = new THREE.DirectionalLight(0x4a90e2, 1.8);
        rimLight1.position.set(-8, 6, -4);
        scene.add(rimLight1);
        const rimLight2 = new THREE.DirectionalLight(0x50e3c2, 1.2);
        rimLight2.position.set(8, -4, -6);
        scene.add(rimLight2);
        scene.add(new THREE.AmbientLight(0x0a0a2e, 0.08));

        // Mouse Tracking
        const mouse = new THREE.Vector2();
        const handleMouseMove = (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Animation Loop
        let time = 0;
        const animate = () => {
            time += 0.01;

            // Update shaders
            analogDecayPass.uniforms.uTime.value = time;

            // Ghost movement (follow mouse slightly)
            const targetX = mouse.x * 2; // Reduced range for sidebar
            const targetY = mouse.y * 2;

            ghostGroup.position.x += (targetX - ghostGroup.position.x) * 0.05;
            ghostGroup.position.y += (targetY - ghostGroup.position.y) * 0.05;

            // Floating
            ghostGroup.position.y += Math.sin(time * 2) * 0.01;

            // Rotation towards mouse
            ghostBody.rotation.y = mouse.x * 0.5;
            ghostBody.rotation.x = -mouse.y * 0.5;

            composer.render();
            requestRef.current = requestAnimationFrame(animate);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (container && renderer.domElement) container.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    return <div ref={containerRef} className="w-full h-64 relative overflow-hidden" />;
};

export default Ghost;
