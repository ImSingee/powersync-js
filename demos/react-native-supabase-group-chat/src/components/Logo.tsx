import Svg, { Defs, LinearGradient, Path, Stop, SvgProps } from 'react-native-svg';

import { config } from '@/lib/config';

export function Logo({ gradient, ...props }: SvgProps & { gradient?: boolean }) {
  return (
    <Svg viewBox="0 -960 960 960" fill="currentColor" {...props}>
      <Defs>
        <LinearGradient id="gradient" x1="0" x2="0" y1="1" y2="0">
          <Stop offset="0%" stopColor={config.brand1} />
          <Stop offset="100%" stopColor={config.brand2} />
        </LinearGradient>
      </Defs>
      <Path
        fill={gradient ? 'url(#gradient)' : undefined}
        d="M280-240q-17 0-28.5-11.5T240-280v-80h520v-360h80q17 0 28.5 11.5T880-680v600L720-240H280ZM80-280v-560q0-17 11.5-28.5T120-880h520q17 0 28.5 11.5T680-840v360q0 17-11.5 28.5T640-440H240L80-280Zm520-240v-280H160v280h440Zm-440 0v-280 280Z"
      />
    </Svg>
  );
}
