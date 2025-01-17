import { memo } from "react";
import Image from "next/image";
import Chog from "./assets/chog.png";
import Molandak from "./assets/molandak.png";
import Moyaki from "./assets/moyaki.png";
import { CardType, MNCard } from "~~/app/type";

export type CardProps = {
  elements: MNCard;
};

export const Card = memo((props: CardProps) => {
  const total = props.elements.filter(element => element != CardType.None).length;
  const elements = props.elements.filter(element => element != CardType.None);
  const getElementClass = (index: number) => {
    if (total === 3) {
      switch (index) {
        case 0:
          return "col-start-1 col-end-2 row-start-1 row-end-2"; // 1号位置
        case 1:
          return "col-start-2 col-end-3 row-start-2 row-end-3"; // 5号位置
        case 2:
          return "col-start-3 col-end-4 row-start-3 row-end-4"; // 9号位置
        default:
          return "";
      }
    }
    return "place-self-center";
  };
  const getOuterClass = () => {
    switch (total) {
      case 4:
        return "grid grid-cols-2 grid-rows-2"; // 2x2 网格
      case 3:
        return "grid grid-cols-3 grid-rows-3"; // 同样是2x2网格，但只使用3个格子
      case 2:
        return "grid grid-cols-1 grid-rows-2"; // 1x2 网格
      case 1:
        return "grid grid-cols-1 grid-rows-1"; // 1x1 网格
      default:
        return "grid";
    }
  };

  return (
    <div className={"p-2 relative w-48 h-64 rounded-md bg-[#836EF9] " + getOuterClass()}>
      {elements.map((element, index) => (
        <div key={index} className={`${getElementClass(index)} rounded-md h-fit`}>
          {element == CardType.Chog ? (
            <Image className="w-16 h-16 object-contain " src={Chog} alt="Chog" />
          ) : element == CardType.Molandak ? (
            <Image className="w-16 h-16 object-contain" src={Molandak} alt="Molandak" />
          ) : element == CardType.Moyaki ? (
            <Image className="w-16 h-16 object-contain" src={Moyaki} alt="Moyaki" />
          ) : null}
        </div>
      ))}
    </div>
  );
});

Card.displayName = "Card";
export default Card;
