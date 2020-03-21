import React, { useState, useLayoutEffect, useCallback, createContext, useContext, useMemo, useEffect, useRef } from 'react';
import mojs from 'mo-js';

import styles from './index.css';

const initialState = {
  count: 0,
  countTotal: 56,
  isClicked: false
};

/**
 * Custom Hook for animation
 */
const tlInitialState = new mojs.Timeline(); // để mỗi lần chạy lại useClapAnimation, ko cần chạy lại new mojs.Timeline()
const useClapAnimation = ({ clapEl, clapCountEl, clapTotalEl }) => {
  const [animationTimeline, setAnimationTimeline] = useState(tlInitialState);

  useLayoutEffect(() => {
    if (!clapEl || !clapCountEl || !clapTotalEl) {
      return;
    }

    const tlDuration = 300;

    // Tạo animation property rồi add vô timeline obj
    const scaleButton = new mojs.Html({
      el: clapEl,
      duration: tlDuration,
      scale: { 1.3: 1 },
      easing: mojs.easing.ease.out
    });

    // Tạo burst tam giác, rồi add vô timeline
    const triangleBurst = new mojs.Burst({
      parent: clapEl, // burst sẽ phát ra từ parent này
      radius: { 50: 95 }, // bắt đầu từ đâu phát ra tới đâu thì mất
      count: 5, // phát ra mấy mảnh
      angle: 30,
      children: {
        shape: 'polygon', // sẽ ra tam giác
        radius: { 6: 0 },
        angle: 90,
        stroke: 'rgba(211,54,0,0.5)',
        strokeWidth: 2,
        speed: 0.2,
        delay: 30,
        duration: tlDuration,
        easing: mojs.easing.bezier(0.1, 1, 0.3, 1)
      }
    });

    const circleBurst = new mojs.Burst({
      parent: clapEl, // burst sẽ phát ra từ parent này
      radius: { 50: 75 }, // bắt đầu từ đâu phát ra tới đâu thì mất
      count: 5, // phát ra mấy mảnh
      angle: 25,
      duration: tlDuration,
      children: {
        shape: 'circle',
        radius: { 3: 0 },
        fill: 'rgba(149,165,166,0.5)',
        delay: 30,
        speed: 0.2,
        easing: mojs.easing.bezier(0.1, 1, 0.3, 1)
      }
    });

    // Tạo animation cho count rồi add vô timeline
    const countAnimation = new mojs.Html({
      el: clapCountEl,
      duration: tlDuration,
      opacity: { 0: 1 },
      y: { 0: -30 }
    }).then({
      delay: 0.5 * tlDuration,
      opacity: { 1: 0 },
      y: -80
    });

    // Tạo animation cho CountTotal rồi add vô timeline
    const countTotalAnimation = new mojs.Html({
      el: clapTotalEl,
      duration: tlDuration,
      opacity: { 0: 1 },
      delay: 1.5 * tlDuration,
      y: { 0: -3 }
    });

    // Fix initial scale 1.3
    if (typeof clapEl === 'string') {
      const clap = document.getElementById('clap');
      clap.style.transform = 'scale(1,1)';
    } else {
      clapEl.style.transform = 'scale(1,1)';
    }
    

    const newAnimationTimeline = animationTimeline.add([
      scaleButton,
      countTotalAnimation,
      countAnimation,
      triangleBurst,
      circleBurst
    ]);

    setAnimationTimeline(newAnimationTimeline);
  }, [clapEl, clapCountEl, clapTotalEl]);

  return animationTimeline;
};

// Context object
const MediumClapContext = createContext()
const { Provider } = MediumClapContext

const MediumClap = ({ children, onClap, style: userStyles = {} }) => {
  const [clapState, setClapState] = useState(initialState);
  const { count/*, countTotal, isClicked*/ } = clapState;
  const MAXIMUM_USER_CLAP = 50;

  const [{ clapRef, clapCountRef, clapTotalRef }, setRefState] = useState({})

  // Gói trong useCallback để lúc re-render ko tạo reference mới gây re-render child-component
  const setRef = useCallback(node => {
    // Chạy 3 lần lúc đầu, vì có 3 ref={setRef} ở JSX
    // Lưu node này vô state
    setRefState(prevRefState => ({
      ...prevRefState,
      [node.dataset.refkey]: node
    }))
  }, [])

  const animationTimeline = useClapAnimation({
    clapEl: clapRef, 
    clapCountEl: clapCountRef, 
    clapTotalEl:  clapTotalRef
  });

  const componentJustMounted = useRef(true);
  useEffect(() => {
      if (componentJustMounted.current === false) {
        onClap && onClap(clapState); // onClap &&: check nếu có truyền onClap
      } else {
        componentJustMounted.current = false;
      }  
  }, [count]); // count changes ~ click clap

  const handleClapClick = () => {
    animationTimeline.replay();

    setClapState(prevState => ({
      isClicked: true,
      count: Math.min(prevState.count + 1, MAXIMUM_USER_CLAP),
      countTotal:
        count < MAXIMUM_USER_CLAP
          ? prevState.countTotal + 1
          : prevState.countTotal
    }));
  };

  // Tránh tạo lại obj mới khi clapState, setRef ko đổi --> đỡ tốn bộ nhớ + đỡ re-render lại <Provider></Provider>
  const memoizedValue = useMemo(() => ({ ...clapState, setRef }), [clapState, setRef])
  return (
    <Provider value={memoizedValue}>
        <button ref={setRef} 
            data-refkey='clapRef' 
            className={styles.clap} 
            onClick={handleClapClick} 
            style={userStyles}
        >
            { children }
        </button>
    </Provider>
  );
};

/**
 * Sub-components
 */
const ClapIcon = ({ style: userStyles = {} }) => {
    const { isClicked } = useContext(MediumClapContext)

  // console.log('styles.icon', styles.icon) // styles.icon _3khjKaXdhQTMmXhpgXic0V
  return (
    <span>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='-549 338 100.1 125'
        className={`${styles.icon} ${isClicked && styles.checked}`}
        style={userStyles}
      >
        <path d='M-471.2 366.8c1.2 1.1 1.9 2.6 2.3 4.1.4-.3.8-.5 1.2-.7 1-1.9.7-4.3-1-5.9-2-1.9-5.2-1.9-7.2.1l-.2.2c1.8.1 3.6.9 4.9 2.2zm-28.8 14c.4.9.7 1.9.8 3.1l16.5-16.9c.6-.6 1.4-1.1 2.1-1.5 1-1.9.7-4.4-.9-6-2-1.9-5.2-1.9-7.2.1l-15.5 15.9c2.3 2.2 3.1 3 4.2 5.3zm-38.9 39.7c-.1-8.9 3.2-17.2 9.4-23.6l18.6-19c.7-2 .5-4.1-.1-5.3-.8-1.8-1.3-2.3-3.6-4.5l-20.9 21.4c-10.6 10.8-11.2 27.6-2.3 39.3-.6-2.6-1-5.4-1.1-8.3z' />
        <path d='M-527.2 399.1l20.9-21.4c2.2 2.2 2.7 2.6 3.5 4.5.8 1.8 1 5.4-1.6 8l-11.8 12.2c-.5.5-.4 1.2 0 1.7.5.5 1.2.5 1.7 0l34-35c1.9-2 5.2-2.1 7.2-.1 2 1.9 2 5.2.1 7.2l-24.7 25.3c-.5.5-.4 1.2 0 1.7.5.5 1.2.5 1.7 0l28.5-29.3c2-2 5.2-2 7.1-.1 2 1.9 2 5.1.1 7.1l-28.5 29.3c-.5.5-.4 1.2 0 1.7.5.5 1.2.4 1.7 0l24.7-25.3c1.9-2 5.1-2.1 7.1-.1 2 1.9 2 5.2.1 7.2l-24.7 25.3c-.5.5-.4 1.2 0 1.7.5.5 1.2.5 1.7 0l14.6-15c2-2 5.2-2 7.2-.1 2 2 2.1 5.2.1 7.2l-27.6 28.4c-11.6 11.9-30.6 12.2-42.5.6-12-11.7-12.2-30.8-.6-42.7m18.1-48.4l-.7 4.9-2.2-4.4m7.6.9l-3.7 3.4 1.2-4.8m5.5 4.7l-4.8 1.6 3.1-3.9' />
      </svg>
    </span>
  );
};

const ClapCount = ({ style: userStyles = {} }) => {
    const { count, setRef } = useContext(MediumClapContext)

  return (
    <span ref={setRef} 
        data-refkey='clapCountRef' 
        className={styles.count}
        style={userStyles}
    >
      + {count}
    </span>
  );
};

const CountTotal = ({ style: userStyles = {} }) => {
    const { countTotal, setRef } = useContext(MediumClapContext)

  return (
    <span ref={setRef} 
        data-refkey='clapTotalRef' 
        className={styles.total}
        style={userStyles}
    >
      {countTotal}
    </span>
  );
};

MediumClap.Icon = ClapIcon
MediumClap.Total = CountTotal
MediumClap.Count = ClapCount

/**
 * Usage
 */
const Usage = () => {
    const [count, setCount] = useState(0)
    const handleClap = clapState => {
        setCount(clapState.count)
    }

  return (
      <div style={{ width: '100%' }}>
        <MediumClap onClap={handleClap} style={{ border: '1px solid red' }}>
            <MediumClap.Icon style={{ stroke: 'blue' }} />
            <MediumClap.Total style={{ background: 'yellow', color: 'black', fontSize: '16px' }} />
            <MediumClap.Count style={{ background: 'pink' }} />
        </MediumClap>
        { !!count && <div className={styles.info}>You have clapped {count}</div> }
      </div>
  );
};

export default Usage;
// export default withClapAnimation(MediumClap)
