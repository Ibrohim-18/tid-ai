import CyberneticGridShader from '@/components/ui/cybernetic-grid-shader';

export default function CyberneticGridShaderDemo() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <CyberneticGridShader />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Cybernetic Grid</h1>
        <p className="mt-3 max-w-xl text-sm text-white/70">Interactive WebGL shader background preview for transparent canvas mode.</p>
      </div>
    </div>
  );
}