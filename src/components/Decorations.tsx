/** Ambient background — warm dewy glows, like morning light through mist */

export default function Decorations() {
  return (
    <div className="ambient-bg">
      {/* Center warm glow — peach/amber warmth */}
      <div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          left: '30%',
          top: '40%',
          filter: 'blur(160px)',
          background: 'radial-gradient(circle, rgba(251, 146, 60, 0.06), transparent 65%)',
        }}
      />
    </div>
  );
}
