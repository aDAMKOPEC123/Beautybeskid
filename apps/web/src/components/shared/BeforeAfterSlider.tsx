// filepath: apps/web/src/components/shared/BeforeAfterSlider.tsx
import ReactCompareImage from 'react-compare-image';
import { motion } from 'framer-motion';

interface Props {
  beforeSrc: string;
  afterSrc: string;
  title?: string;
  description?: string;
  hover?: boolean;
}

export const BeforeAfterSlider = ({ beforeSrc, afterSrc, title, description, hover }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      className="flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className="relative w-full overflow-hidden bg-muted group cursor-ew-resize">
         <ReactCompareImage
           leftImage={beforeSrc}
           rightImage={afterSrc}
           leftImageLabel="Przed"
           rightImageLabel="Po"
           sliderLineWidth={3}
           sliderLineColor="#C8956C"
           hover={hover ?? true}
           handle={
             <div
               style={{
                 width: 44,
                 height: 44,
                 borderRadius: '50%',
                 background: '#C8956C',
                 border: '3px solid white',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 color: 'white',
                 fontSize: 18,
                 cursor: 'ew-resize',
                 userSelect: 'none',
               }}
             >
               ⇄
             </div>
           }
         />
      </div>
      {title && (
        <div className="p-4">
          <h3 className="font-bold text-xl font-heading text-primary">{title}</h3>
          {description && <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{description}</p>}
        </div>
      )}
    </motion.div>
  );
};
