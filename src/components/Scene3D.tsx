/**
 * 3D — extrusão da mesma geometria 2D (especificação, seção 6).
 * Fundo claro, sombra de contato no chão, textura de granito procedural
 * (placeholder até as fotos reais das chapas). Frontão e saia como extrusões.
 */
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  contornoBancada,
  geometriaRecorte,
  segmentosDoComplemento,
} from "@/domain/geometry";
import type { Projeto } from "@/domain/project";
import { desenharPedra, type ParamsPedra } from "@/domain/stoneTexture";

interface Props {
  projeto: Projeto;
  params?: ParamsPedra | null;
  apresentacao?: boolean;
}

const MM = 1000;

const PADRAO: ParamsPedra = { estilo: "quartzo", base: "#dedede", veio: "#bcbcbc", intensidade: 0.5 };

/** Textura de pedra procedural aplicada na peça inteira (UV esticado). */
function texturaPedra(params: ParamsPedra): THREE.CanvasTexture {
  const s = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  if (ctx) desenharPedra(ctx, s, params);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.05, 1.05);
  tex.anisotropy = 8;
  return tex;
}

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
      const sobe = comp.tipo === "frontao" || comp.tipo === "rodabanca";

      segs.forEach((s, i) => {
        const dx = (s.b.x - s.a.x) / MM;
        const dy = (s.b.y - s.a.y) / MM;
        const len = Math.hypot(dx, dy);
        if (len < 0.01) return;
        const mx = (s.a.x + s.b.x) / (2 * MM);
        const my = (s.a.y + s.b.y) / (2 * MM);
        const nx = -dy / len;
        const ny = dx / len;
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

function Bancada({ projeto, params }: { projeto: Projeto; params: ParamsPedra }) {
  const slab = useSlab(projeto);
  const comps = useComplementos(projeto);
  const tex = useMemo(
    () => texturaPedra(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.estilo, params.base, params.base2, params.veio, params.intensidade],
  );

  return (
    <Center disableY>
      <group>
        <mesh geometry={slab} castShadow receiveShadow>
          <meshStandardMaterial map={tex} color="#ffffff" roughness={0.4} metalness={0.02} />
        </mesh>
        {comps.map((c) => (
          <mesh key={c.key} position={c.pos} rotation={[0, c.rotY, 0]} castShadow receiveShadow>
            <boxGeometry args={c.args} />
            <meshStandardMaterial map={tex} color="#ffffff" roughness={0.45} metalness={0.02} />
          </mesh>
        ))}
      </group>
    </Center>
  );
}

export function Scene3D({ projeto, params, apresentacao = false }: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.6, 2.1, 3], fov: 40 }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={[apresentacao ? "#eef0f2" : "#f4f5f6"]} />
      <hemisphereLight intensity={0.75} groundColor="#c9cdd2" color="#ffffff" />
      <directionalLight
        position={[4, 7, 4]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} />

      <Bounds fit clip observe margin={1.25}>
        <Bancada projeto={projeto} params={params ?? PADRAO} />
      </Bounds>

      <ContactShadows
        position={[0, -0.02, 0]}
        opacity={0.42}
        scale={10}
        blur={2.4}
        far={2}
        resolution={1024}
      />

      <OrbitControls
        makeDefault
        enablePan={!apresentacao}
        autoRotate={apresentacao}
        autoRotateSpeed={0.8}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
