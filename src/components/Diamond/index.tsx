import { DIAMOND_POSITIONS } from '../../utils/Constants';
import { Diamond } from './Diamond';

interface DiamondsProps {
  isMobile: boolean;
}

export function Diamonds({ isMobile }: DiamondsProps) {
  return (
    <group>
      {DIAMOND_POSITIONS.map((_, index) => (
        <Diamond key={`diamond-${index}`} index={index} isMobile={isMobile} />
      ))}
    </group>
  );
}

export { Diamond } from './Diamond';
export { DiamondAura } from './DiamondAura';
export { DiamondDebris, DiamondStructures } from './DiamondDebris';
export { DiamondPatterns, createHalfDiamondGeometry } from './DiamondGeometry';
