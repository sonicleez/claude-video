import {Composition} from 'remotion';
import {FPS, W, H} from './brand';
import {Day01, DAY01_DURATION} from './days/Day01';
// One composition per day of the 30-day series: add DayNN here as they are built.
export const RemotionRoot = () => (
  <>
    <Composition id="Day01" component={Day01} durationInFrames={DAY01_DURATION} fps={FPS} width={W} height={H} />
  </>
);
