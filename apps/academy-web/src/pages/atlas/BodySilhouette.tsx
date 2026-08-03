export function BodySilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: '100%', maxHeight: '100%' }}
    >
      {/* Head */}
      <ellipse cx="100" cy="38" rx="24" ry="28" fill="#d4e4d6" stroke="#8bab8d" strokeWidth="1.5" />
      {/* Neck */}
      <path d="M90 65 Q90 75 88 80 L112 80 Q110 75 110 65" fill="#d4e4d6" stroke="#8bab8d" strokeWidth="1.5" />
      {/* Shoulders & Torso */}
      <path
        d="M88 80 Q60 82 40 95 L38 100 Q36 110 38 130 L40 160 Q42 175 44 185 L48 200
           Q52 215 56 225 L62 235 Q70 240 80 242 L100 245 L120 242
           Q130 240 138 235 L144 225 Q148 215 152 200 L156 185
           Q158 175 160 160 L162 130 Q164 110 162 100 L160 95
           Q140 82 112 80 Z"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.5"
      />
      {/* Left arm */}
      <path
        d="M40 95 Q30 100 24 115 L18 140 Q14 160 12 175 L10 195
           Q9 205 12 210 L18 212 Q22 210 24 205 L26 195
           Q28 180 30 170 L34 155 Q36 145 38 135"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.5"
      />
      {/* Left hand */}
      <path
        d="M10 195 Q6 210 5 218 Q4 225 6 230 Q8 234 12 232 L14 228
           Q12 222 12 218 L14 212 M12 210 Q10 220 8 225"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.2"
      />
      {/* Right arm */}
      <path
        d="M160 95 Q170 100 176 115 L182 140 Q186 160 188 175 L190 195
           Q191 205 188 210 L182 212 Q178 210 176 205 L174 195
           Q172 180 170 170 L166 155 Q164 145 162 135"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.5"
      />
      {/* Right hand */}
      <path
        d="M190 195 Q194 210 195 218 Q196 225 194 230 Q192 234 188 232 L186 228
           Q188 222 188 218 L186 212 M188 210 Q190 220 192 225"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.2"
      />
      {/* Hips / Pelvis */}
      <path
        d="M62 235 Q58 248 56 260 L58 272 Q65 280 80 282 L100 284 L120 282
           Q135 280 142 272 L144 260 Q142 248 138 235"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.5"
      />
      {/* Left leg */}
      <path
        d="M58 272 Q56 290 55 310 L54 340 Q53 360 54 380 L56 400
           Q57 415 58 430 L60 445 Q61 455 62 460 L65 470
           Q64 478 62 485 L60 492 Q58 498 60 502 L68 504
           Q72 502 74 498 L72 490 Q70 480 70 470
           L68 450 Q67 435 66 420 L65 400 Q64 380 64 360
           L65 340 Q66 315 68 295 L72 280"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.5"
      />
      {/* Left foot */}
      <path
        d="M60 502 Q55 506 50 508 Q46 510 44 508 Q42 505 46 503 L54 500 Q57 499 60 502"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.2"
      />
      {/* Right leg */}
      <path
        d="M142 272 Q144 290 145 310 L146 340 Q147 360 146 380 L144 400
           Q143 415 142 430 L140 445 Q139 455 138 460 L135 470
           Q136 478 138 485 L140 492 Q142 498 140 502 L132 504
           Q128 502 126 498 L128 490 Q130 480 130 470
           L132 450 Q133 435 134 420 L135 400 Q136 380 136 360
           L135 340 Q134 315 132 295 L128 280"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.5"
      />
      {/* Right foot */}
      <path
        d="M140 502 Q145 506 150 508 Q154 510 156 508 Q158 505 154 503 L146 500 Q143 499 140 502"
        fill="#d4e4d6"
        stroke="#8bab8d"
        strokeWidth="1.2"
      />

      {/* Subtle anatomical details */}
      {/* Chest line */}
      <path d="M80 110 Q100 120 120 110" stroke="#b0c9b2" strokeWidth="0.8" fill="none" />
      {/* Waist */}
      <path d="M68 195 Q100 190 132 195" stroke="#b0c9b2" strokeWidth="0.8" fill="none" />
      {/* Navel */}
      <circle cx="100" cy="210" r="2.5" fill="#b0c9b2" />
      {/* Collarbone */}
      <path d="M60 88 Q80 84 100 86 Q120 84 140 88" stroke="#b0c9b2" strokeWidth="0.8" fill="none" />
      {/* Knees */}
      <ellipse cx="65" cy="380" rx="8" ry="5" fill="none" stroke="#b0c9b2" strokeWidth="0.7" />
      <ellipse cx="135" cy="380" rx="8" ry="5" fill="none" stroke="#b0c9b2" strokeWidth="0.7" />
    </svg>
  );
}
