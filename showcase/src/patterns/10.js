import React, {
  useState,
  useLayoutEffect,
  useCallback,
  useRef,
  useEffect,
  useReducer
} from 'react';
import mojs from 'mo-js';

import styles from './index.css';
import userStyles from './usage.css';

/**
 * Custom Hook for animation
 */
const tlInitialState = new mojs.Timeline(); // để mỗi lần chạy lại useClapAnimation, ko cần chạy lại new mojs.Timeline()
const useClapAnimation = ({ clapEl, clapCountEl, clapTotalEl }) => {
  console.log('useClapAnimation useClapAnimation');
  const [animationTimeline, setAnimationTimeline] = useState(tlInitialState);

  useLayoutEffect(() => {
    console.log('useLayoutEffect useLayoutEffect', {
      clapEl,
      clapCountEl,
      clapTotalEl
    });
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

/**
 * useDOMRef Hook
 */
const useDOMRef = () => {
  const [DOMRef, setRefState] = useState({});

  const setRef = useCallback(node => {
    setRefState(prevRefState => ({
      ...prevRefState,
      [node.dataset.refkey]: node
    }));
  }, []);

  return [DOMRef, setRef];
};

// 1. Trả về function vì <button onClick={1 hàm gì đó} />
// 2. args là 1 array chứa tất cả biến đc truyền vô (có thể là $event,...), mình truyền đúng các biến đó vô các fn để nó chạy
const callFnsInSequence = (...fns) => {
  return (...args) => {
    fns.forEach(fn => fn && fn(...args));
  };
};

/**
 * Custom hook for getting the previous state/prop
 */
const usePrevious = value => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

/**
 * Custom hook for useClapState
 */
const MAXIMUM_USER_CLAP = 50;
const INITIAL_STATE = {
  count: 0,
  countTotal: 56,
  isClicked: false
};
const internalReducer = (state, action) => {
  const { type, payload } = action;
  const { count, countTotal } = state;
  switch (type) {
    case 'CLAP':
      return {
        isClicked: true,
        count: Math.min(count + 1, MAXIMUM_USER_CLAP),
        countTotal: count < MAXIMUM_USER_CLAP ? countTotal + 1 : countTotal
      };
    case 'RESET':
      return payload;

    default:
      return state;
  }
};
const useClapState = (
  initialState = INITIAL_STATE,
  reducer = internalReducer
) => {
  // const [clapState, setClapState] = useState(initialState);
  const [clapState, dispatch] = useReducer(reducer, initialState);
  const { count, countTotal, isClicked } = clapState;
  const initialStateRef = useRef(initialState); // dùng useRef để đựng initialState, useRef không đổi suốt vòng đời của component, đồng thời cũng ko re-render dù giá trị có thay đổi

  const updateClapState = () => dispatch({ type: 'CLAP' });

  /**
   * - Để Reset state về trạng thái ban đầu
   * - Chỉ cần khởi tạo 1 lần, ko cần cập nhật gì khi custom hook này chạy lại
   * - Dùng useCallback để tối ưu và lẽ ra, dependencies là mảng rỗng []
   */
  const resetRef = useRef(0);
  const prevCount = usePrevious(count);
  const reset = useCallback(() => {
    // if there's a change to state
    if (prevCount !== count) {
      dispatch({ type: 'RESET', payload: initialStateRef.current });
      resetRef.current++;
    }
  }, [prevCount, count, dispatch]);

  // props getter
  const getTogglerProps = ({ handleClick, ...otherProps }) => ({
    handleClick: callFnsInSequence(updateClapState, handleClick),
    'aria-pressed': isClicked,
    ...otherProps
  });

  // props getter
  const getCounterProps = ({ ...otherProps }) => ({
    count,
    'aria-valuemax': MAXIMUM_USER_CLAP,
    'aria-valuemin': 0,
    'aria-valuenow': count,
    ...otherProps
  });

  return {
    clapState,
    updateClapState,
    getTogglerProps,
    getCounterProps,
    reset,
    resetDep: resetRef.current
  };
};
useClapState.reducer = internalReducer;
useClapState.types = {
  CLAP: 'CLAP',
  RESET: 'RESET'
};

/**
 * Custom hook for useEffectAfterMount
 */
const useEffectAfterMount = (cb, deps) => {
  const componentJustMounted = useRef(true);
  useEffect(() => {
    if (componentJustMounted.current === false) {
      return cb();
    } else {
      componentJustMounted.current = false;
    }
  }, deps);
};

/**
 * Sub-components
 */
const ClapContainer = ({ children, setRef, handleClick, ...restProps }) => {
  return (
    <button
      ref={setRef}
      className={styles.clap}
      onClick={handleClick}
      {...restProps}
    >
      {children}
    </button>
  );
};

const ClapIcon = ({ isClicked }) => {
  // console.log('styles.icon', styles.icon) // styles.icon _3khjKaXdhQTMmXhpgXic0V

  return (
    <span>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='-549 338 100.1 125'
        className={`${styles.icon} ${isClicked && styles.checked}`}
      >
        <path d='M-471.2 366.8c1.2 1.1 1.9 2.6 2.3 4.1.4-.3.8-.5 1.2-.7 1-1.9.7-4.3-1-5.9-2-1.9-5.2-1.9-7.2.1l-.2.2c1.8.1 3.6.9 4.9 2.2zm-28.8 14c.4.9.7 1.9.8 3.1l16.5-16.9c.6-.6 1.4-1.1 2.1-1.5 1-1.9.7-4.4-.9-6-2-1.9-5.2-1.9-7.2.1l-15.5 15.9c2.3 2.2 3.1 3 4.2 5.3zm-38.9 39.7c-.1-8.9 3.2-17.2 9.4-23.6l18.6-19c.7-2 .5-4.1-.1-5.3-.8-1.8-1.3-2.3-3.6-4.5l-20.9 21.4c-10.6 10.8-11.2 27.6-2.3 39.3-.6-2.6-1-5.4-1.1-8.3z' />
        <path d='M-527.2 399.1l20.9-21.4c2.2 2.2 2.7 2.6 3.5 4.5.8 1.8 1 5.4-1.6 8l-11.8 12.2c-.5.5-.4 1.2 0 1.7.5.5 1.2.5 1.7 0l34-35c1.9-2 5.2-2.1 7.2-.1 2 1.9 2 5.2.1 7.2l-24.7 25.3c-.5.5-.4 1.2 0 1.7.5.5 1.2.5 1.7 0l28.5-29.3c2-2 5.2-2 7.1-.1 2 1.9 2 5.1.1 7.1l-28.5 29.3c-.5.5-.4 1.2 0 1.7.5.5 1.2.4 1.7 0l24.7-25.3c1.9-2 5.1-2.1 7.1-.1 2 1.9 2 5.2.1 7.2l-24.7 25.3c-.5.5-.4 1.2 0 1.7.5.5 1.2.5 1.7 0l14.6-15c2-2 5.2-2 7.2-.1 2 2 2.1 5.2.1 7.2l-27.6 28.4c-11.6 11.9-30.6 12.2-42.5.6-12-11.7-12.2-30.8-.6-42.7m18.1-48.4l-.7 4.9-2.2-4.4m7.6.9l-3.7 3.4 1.2-4.8m5.5 4.7l-4.8 1.6 3.1-3.9' />
      </svg>
    </span>
  );
};

const ClapCount = ({ count, setRef, ...restProps }) => {
  return (
    <span ref={setRef} className={styles.count} {...restProps}>
      + {count}
    </span>
  );
};

const CountTotal = ({ countTotal, setRef, ...restProps }) => {
  return (
    <span ref={setRef} className={styles.total} {...restProps}>
      {countTotal}
    </span>
  );
};

/**
 * Usage
 */
const userInitialState = {
  count: 0,
  countTotal: 1000,
  isClicked: false
};
const Usage = () => {
  const [timesClapped, setTimeClapped] = useState(0);
  const isClappedTooMuch = timesClapped >= 8;
  const reducer = (state, action) => {
    if (useClapState.types.CLAP === action.type && isClappedTooMuch) {
      return state;
    }
    return useClapState.reducer(state, action);
  };
  const [{ clapRef, clapCountRef, clapTotalRef }, setRef] = useDOMRef();

  const {
    clapState: { count, countTotal, isClicked },
    updateClapState,
    getTogglerProps,
    getCounterProps,
    reset,
    resetDep
  } = useClapState(userInitialState, reducer);

  const animationTimeline = useClapAnimation({
    clapEl: clapRef,
    clapCountEl: clapCountRef,
    clapTotalEl: clapTotalRef
  });

  useEffectAfterMount(() => {
    animationTimeline.replay();
  }, [count]);

  // Sau khi animation xong, user muốn update thông tin reset tới db (1 vd cho side effect)
  const [uploadingReset, setUpload] = useState(false); // giống như isLoading riêng cho reset
  useEffectAfterMount(() => {
    setUpload(true);
    setTimeClapped(0);
    const id = setTimeout(() => setUpload(false), 3000);
    return () => clearTimeout(id);
  }, [resetDep]); // resetDep là 1 cái tào lao gì đó sẽ thay đổi khi user nhấn reset

  const handleClick = () => {
    console.log('%c CLICKED!!!', 'background:yellow');
    setTimeClapped(preVal => preVal + 1);
  };

  return (
    <div>
      <ClapContainer
        setRef={setRef}
        data-refkey='clapRef'
        {...getTogglerProps({
          'aria-pressed': false,
          handleClick
        })}
      >
        <ClapIcon isClicked={isClicked} />

        <ClapCount
          setRef={setRef}
          data-refkey='clapCountRef'
          {...getCounterProps()}
        />
        <UserDefineClapCountComponent {...getCounterProps()} />

        <CountTotal
          setRef={setRef}
          countTotal={countTotal}
          data-refkey='clapTotalRef'
        />
      </ClapContainer>
      <section>
        <button className={userStyles.resetBtn} onClick={reset}>
          Reset
        </button>
        <pre className={userStyles.resetMsg}>
          {JSON.stringify({ timesClapped, count, countTotal })}
        </pre>
        <pre className={userStyles.resetMsg}>
          {uploadingReset ? `The reset data is uploading... ${resetDep}` : ''}
        </pre>
        <pre style={{ color: 'red' }}>
          {isClappedTooMuch &&
            `You have clapped ${count} times. Don't be so generous :)`}
        </pre>
      </section>
    </div>
  );
};

const UserDefineClapCountComponent = ({ count }) => {
  return <div>{count}</div>;
};

export default Usage;
// export default withClapAnimation(MediumClap)
