export function BodySilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: '100%', maxHeight: '100%' }}
    >
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#dceade" />
          <stop offset="100%" stopColor="#c5d9c7" />
        </radialGradient>
      </defs>

      {/* Full body outline — single path for clean silhouette */}
      <path
        d={`
          M 150 18
          C 131 18, 118 32, 118 52
          C 118 72, 131 86, 150 86
          C 169 86, 182 72, 182 52
          C 182 32, 169 18, 150 18
          Z
        `}
        fill="url(#bodyGrad)"
        stroke="#9ab89c"
        strokeWidth="1.4"
      />

      {/* Neck */}
      <path
        d="M 138 84 C 138 96, 136 100, 134 104 L 166 104 C 164 100, 162 96, 162 84"
        fill="url(#bodyGrad)"
        stroke="#9ab89c"
        strokeWidth="1.4"
      />

      {/* Torso + arms + legs as one connected shape */}
      <path
        d={`
          M 134 104
          C 120 106, 100 110, 82 118
          L 68 126
          C 58 132, 50 142, 46 152
          L 36 182
          C 30 198, 26 216, 24 232
          L 20 260
          C 18 272, 18 280, 20 286
          C 22 292, 26 294, 30 292
          C 34 290, 36 284, 38 276
          L 42 256
          C 44 244, 48 230, 52 218
          L 58 200
          C 62 190, 66 182, 72 174
          L 78 166
          C 80 164, 82 162, 84 162
          L 86 168
          C 84 180, 82 194, 80 210
          L 78 240
          C 76 258, 76 276, 78 290
          L 82 310
          C 84 320, 86 328, 88 334
          L 92 346
          C 96 354, 100 358, 108 360
          L 118 362

          L 118 364
          C 116 378, 114 396, 112 416
          L 110 456
          C 108 480, 106 504, 106 524
          L 106 560
          C 106 576, 107 590, 108 600
          L 110 618
          C 111 628, 112 636, 114 642
          L 116 650
          C 117 656, 116 662, 114 668
          L 110 678
          C 108 682, 108 686, 112 688
          L 130 690
          C 136 690, 140 688, 140 684
          L 138 676
          C 136 670, 136 664, 136 658
          L 138 646
          C 139 638, 140 628, 140 618
          L 140 580
          C 140 560, 142 540, 144 520
          L 148 470
          L 150 460

          L 152 470
          L 156 520
          C 158 540, 160 560, 160 580
          L 160 618
          C 160 628, 161 638, 162 646
          L 164 658
          C 164 664, 164 670, 162 676
          L 160 684
          C 160 688, 164 690, 170 690
          L 188 688
          C 192 686, 192 682, 190 678
          L 186 668
          C 184 662, 183 656, 184 650
          L 186 642
          C 188 636, 189 628, 190 618
          L 192 600
          C 193 590, 194 576, 194 560
          L 194 524
          C 194 504, 192 480, 190 456
          L 188 416
          C 186 396, 184 378, 182 364
          L 182 362

          L 192 360
          C 200 358, 204 354, 208 346
          L 212 334
          C 214 328, 216 320, 218 310
          L 222 290
          C 224 276, 224 258, 222 240
          L 220 210
          C 218 194, 216 180, 214 168
          L 216 162
          C 218 162, 220 164, 222 166
          L 228 174
          C 234 182, 238 190, 242 200
          L 248 218
          C 252 230, 256 244, 258 256
          L 262 276
          C 264 284, 266 290, 270 292
          C 274 294, 278 292, 280 286
          C 282 280, 282 272, 280 260
          L 276 232
          C 274 216, 270 198, 264 182
          L 254 152
          C 250 142, 242 132, 232 126
          L 218 118
          C 200 110, 180 106, 166 104
        `}
        fill="url(#bodyGrad)"
        stroke="#9ab89c"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Anatomical details */}
      {/* Collarbones */}
      <path d="M 108 116 Q 130 110, 150 112 Q 170 110, 192 116" stroke="#afc6b1" strokeWidth="0.8" fill="none" />
      {/* Chest subtle line */}
      <path d="M 118 148 Q 150 158, 182 148" stroke="#afc6b1" strokeWidth="0.7" fill="none" />
      {/* Waist lines */}
      <path d="M 92 240 Q 120 234, 150 236 Q 180 234, 208 240" stroke="#afc6b1" strokeWidth="0.6" fill="none" />
      {/* Navel */}
      <ellipse cx="150" cy="260" rx="3" ry="4" fill="#afc6b1" opacity="0.6" />
      {/* Hip line */}
      <path d="M 100 330 Q 130 338, 150 340 Q 170 338, 200 330" stroke="#afc6b1" strokeWidth="0.5" fill="none" />
      {/* Knee caps */}
      <ellipse cx="126" cy="520" rx="10" ry="7" fill="none" stroke="#afc6b1" strokeWidth="0.6" />
      <ellipse cx="174" cy="520" rx="10" ry="7" fill="none" stroke="#afc6b1" strokeWidth="0.6" />
    </svg>
  );
}
