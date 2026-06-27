// Statische Bild-Importe (PNG-Assets) typisieren – für `import logo from "...png"`.
declare module "*.png" {
  import type { ImageSourcePropType } from "react-native";
  const content: ImageSourcePropType;
  export default content;
}
