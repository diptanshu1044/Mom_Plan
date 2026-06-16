export function SignupBgPattern() {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-35"
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 720 + 44 * Math.cos(rad);
        const cy = 60 + 44 * Math.sin(rad);
        return (
          <ellipse
            key={`tr${i}`}
            cx={cx}
            cy={cy}
            rx="30"
            ry="13"
            transform={`rotate(${angle} ${cx} ${cy})`}
            fill="#e3dfff"
          />
        );
      })}
      <circle cx="720" cy="60" r="16" fill="#e3dfff" />

      {[0, 72, 144, 216, 288].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 80 + 38 * Math.cos(rad);
        const cy = 520 + 38 * Math.sin(rad);
        return (
          <ellipse
            key={`bl${i}`}
            cx={cx}
            cy={cy}
            rx="24"
            ry="11"
            transform={`rotate(${angle} ${cx} ${cy})`}
            fill="#f0effe"
          />
        );
      })}
      <circle cx="80" cy="520" r="14" fill="#f0effe" />

      {[
        [120, 80, 5],
        [680, 400, 4],
        [50, 280, 3],
        [750, 480, 6],
        [400, 30, 4],
        [200, 550, 5],
      ].map(([x, y, r], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={r} fill="#7a71ff" opacity="0.35" />
      ))}

      <path
        d="M160 500 c0-5 7-5 7 0 c0-5 7-5 7 0 c0 6-7 10-7 10s-7-4-7-10z"
        fill="#674bb5"
        opacity="0.3"
      />
      <path
        d="M640 120 c0-4 5-4 5 0 c0-4 5-4 5 0 c0 5-5 8-5 8s-5-3-5-8z"
        fill="#c4c0ff"
        opacity="0.5"
      />
    </svg>
  );
}
