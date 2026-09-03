/**
 * 3D — extrusão da mesma geometria 2D (especificação, seção 6).
 * "Modo maquete": cinza limpo por padrão. Textura real de chapa entra depois.
 */
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { contornoBancada, geometriaRecorte } from "@/domain/geometry";
import type { Projeto } from "@/domain/project";

interface Props {
  projeto: Projeto;
  /** cor da peça (fallback enquanto não há foto da chapa) */
  cor?: string;
  /** modo apresentação: fundo neutro + órbita lenta automática (seção 8) */
  apresentacao?: boolean;
}

function BancadaMesh({ projeto, cor }: { projeto: Projeto; cor: string }) {
  const geometry = useMemo(() => {
    const { pontos } = contornoBancada(projeto.bancada);

    const shape = new THREE.Shape();
    pontos.forEach((p, i) => {
      const x = p.x / 1000;
      const y = p.y / 1000;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    // recortes viram furos na peça
    for (const r of projeto.recortes) {
      const g = geometriaRecorte(projeto, r);
      const hole = new THREE.Path();
      if (g.raio != null) {
        hole.absellipse(
          g.centro.x / 1000,
          g.centro.y / 1000,
          g.raio / 1000,
          g.raio / 1000,
          0,
          Math.PI * 2,
          true,
          0,
        );
      } else if (r.tipo === "area_molhada" && r.canto === "oval") {
        hole.absellipse(
          g.centro.x / 1000,
          g.centro.y / 1000,
          r.largura / 2000,
          r.profundidade / 2000,
          0,
          Math.PI * 2,
          true,
          0,
        );
      } else {
        g.cantos.forEach((c, i) => {
          const x = c.x / 1000;
          const y = c.y / 1000;
          if (i === 0) hole.moveTo(x, y);
          else hole.lineTo(x, y);
        });
        hole.closePath();
      }
      shape.holes.push(hole);
    }

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: projeto.bancada.espessura / 1000,
      bevelEnabled: false,
    });
    // deita a peça: shape em XY, extrusão em Z -> tampo horizontal
    geo.rotateX(-Math.PI / 2);
    geo.center();
    return geo;
  }, [projeto]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={cor} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

export function Scene3D({ projeto, cor = "#d8d8d5", apresentacao = false }: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.4, 2, 2.8], fov: 42 }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color
        attach="background"
        args={[apresentacao ? "#e9eaec" : "#1f2937"]}
      />
      <hemisphereLight intensity={apresentacao ? 0.9 : 0.6} groundColor="#8a8a8a" />
      <directionalLight
        position={[4, 6, 3]}
        intensity={apresentacao ? 1.4 : 1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 2, -4]} intensity={0.4} />

      <Bounds fit clip observe margin={1.2}>
        <BancadaMesh projeto={projeto} cor={cor} />
      </Bounds>

      <OrbitControls
        makeDefault
        enablePan={!apresentacao}
        autoRotate={apresentacao}
        autoRotateSpeed={0.8}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
