import gsap from 'gsap'
import {MutableRefObject, Ref, useEffect} from "react";

type UseTextAnimationType = {
    targetRef: MutableRefObject<any>
    gsapVars?: GSAPTimelineVars,
    duration: number,
    text: string
}
export const useTextAnimations = ({targetRef, duration, text, gsapVars}: UseTextAnimationType) => {

    const tl = gsap.timeline(gsapVars);

    useEffect(() => {
        tl.to(targetRef.current, {duration, text})
    }, [targetRef]);

    return [tl]

}