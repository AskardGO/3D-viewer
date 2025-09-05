import { gsap } from "gsap";

import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { TextPlugin } from "gsap/TextPlugin";

export const registerGSAPPlugins = () => {
    gsap.registerPlugin(Flip,ScrollTrigger,Draggable,TextPlugin);
}
