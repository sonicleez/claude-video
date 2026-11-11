import {Composition} from 'remotion';
import {FPS, W, H} from './brand';
import {Day01, DAY01_DURATION} from './days/Day01';
import {Short, ShortProps, shortDuration} from './Short';
import {Reel, reelDuration} from './Reel';
// Day01 = hand-built kit layout. Short = data-driven template for daily videos (props from assets/make_short.py).
const SAMPLE: ShortProps = {id: 'sample', tag: 'MẪU', index: '00', hook: ['ITERA'], segs: [], endKit: false};
export const RemotionRoot = () => (
  <>
    <Composition id="Day01" component={Day01} durationInFrames={DAY01_DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Short" component={Short as any} durationInFrames={300} fps={FPS} width={W} height={H} defaultProps={SAMPLE as any}
      calculateMetadata={({props}) => ({durationInFrames: shortDuration(props as any)})} />
    <Composition id="Reel" component={Reel as any} durationInFrames={300} fps={FPS} width={W} height={H}
      defaultProps={{id: 'sample', tag: '', chapters: [], endLines: ['Một kịch bản.', 'MỌI GIỌNG.']} as any}
      calculateMetadata={({props}) => ({durationInFrames: reelDuration(props as any)})} />
  </>
);
