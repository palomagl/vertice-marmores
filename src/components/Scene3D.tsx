/**
 * 3D — extrusão da mesma geometria 2D (especificação, seção 6).
 * "Modo maquete": cinza limpo por padrão. Textura real de chapa entra depois.
 * Frontão e saia entram como extrusões extras.
 */
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  contornoBancada,
  geometriaRecorte,
  segmentosDoComplemento,
} from "@/domain/geometry";
import type { Projeto } from "@/domain/project";

interface Props {
  projeto: Projeto;
  /** cor da peça (fallback enquanto não há foto da chapa) */
  cor?: string;
  /** modo apresentação: fundo neutro + órbita lenta automática (seção 8) */
  apresentacao?: boolean;
}

const MM = 1000;

function useSlab(projeto: Projeto) {
  return useMemo(() => {
    const { pontos } = contornoBancada(projeto.bancada);
    const shape = new THREE.Shape();
    pontos.forEach((p, i) => {
      const x = p.x / MM;
      const y = p.y / MM;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    for (const r of projeto.recortes) {
      const g = geometriaRecorte(projeto, r);
      const hole = new THREE.Path();
      if (g.raio != null) {
        hole.absellipse(g.centro.x / MM, g.centro.y / MM, g.raio / MM, g.raio / MM, 0, Math.PI * 2, true, 0);
      } else if (r.tipo === "area_molhada" && r.canto === "oval") {
        hole.absellipse(g.centro.x / MM, g.centro.y / MM, r.largura / (2 * MM), r.profundidade / (2 * MM), 0, Math.PI * 2, true, 0);
      } else {
        g.cantos.forEach((c, i) => {
          const x = c.x / MM;
          const y = c.y / MM;
          if (i === 0) hole.moveTo(x, y);
          else hole.lineTo(x, y);
        });
        hole.closePath();
      }
      shape.holes.push(hole);
    }

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: projeto.bancada.espessura / MM,
      bevelEnabled: false,
    });
    // shape em XY, extrusão em Z -> deita a peça: (x,y,z) -> (x, z, -y)
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [projeto]);
}

interface Caixa {
  key: string;
  pos: [number, number, number];
  rotY: number;
  args: [number, number, number];
}

function useComplementos(projeto: Projeto): Caixa[] {
  return useMemo(() => {
    const { segmentos } = contornoBancada(projeto.bancada);
    const esp = projeto.bancada.espessura / MM;
    const caixas: Caixa[] = [];

    for (const comp of projeto.complementos) {
      const alt = comp.altura / MM;
      const espParede = Math.max(esp, 0.018);
      const segs = segmentosDoComplemento(segmentos, comp);
      // saia / soleira / pingadeira penduram para baixo; frontão / rodabanca sobem
      const sobe = comp.tipo === "frontao" || comp.tipo === "rodabanca";

      segs.forEach((s, i) => {
        const dx = (s.b.x - s.a.x) / MM;
        const dy = (s.b.y - s.a.y) / MM;
        const len = Math.hypot(dx, dy);
        if (len < 0.01) return;
        const mx = (s.a.x + s.b.x) / (2 * MM);
        const my = (s.a.y + s.b.y) / (2 * MM);
        // normal apontando para dentro (offset para a aba assentar na peça)
        let nx = -dy / len;
        let ny = dx / len;
        // world Z = -y, então o offset em world usa (nx, -ny)
        const cx = mx + nx * (espParede / 2);
        const cy = my + ny * (espParede / 2);
        const worldY = sobe ? esp + alt / 2 : -alt / 2;
        caixas.push({
          key: `${comp.id}-${i}`,
          pos: [cx, worldY, -cy],
          rotY: Math.atan2(dy, dx),
          args: [len, alt, espParede],
        });
      });
    }
    return caixas;
  }, [projeto]);
}

function Bancada({ projeto, cor }: { projeto: Projeto; cor: string }) {
  const slab = useSlab(projeto);
  const comps = useComplementos(projeto);

  return (
    <Center>
      <group>
        <mesh geometry={slab} castShadow receiveShadow>
          <meshStandardMaterial color={cor} roughness={0.55} metalness={0.05} />
        </mesh>
        {comps.map((c) => (
          <mesh key={c.key} position={c.pos} rotation={[0, c.rotY, 0]} castShadow receiveShadow>
            <boxGeometry args={c.args} />
            <meshStandardMaterial color={cor} roughness={0.6} metalness={0.05} />
          </mesh>
        ))}
      </group>
    </Center>
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
      <color attach="background" args={[apresentacao ? "#e9eaec" : "#1f2937"]} />
      <hemisphereLight intensity={apresentacao ? 0.9 : 0.6} groundColor="#8a8a8a" />
      <directionalLight
        position={[4, 6, 3]}
        intensity={apresentacao ? 1.4 : 1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 2, -4]} intensity={0.4} />

      <Bounds fit clip observe margin={1.2}>
        <Bancada projeto={projeto} cor={cor} />
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
