"use client";

/**
 * Thin wrapper around Hugeicons. The library exposes icon data as constants
 * imported from `@hugeicons/core-free-icons`, then rendered through
 * `<HugeiconsIcon icon={...} />`. This file maps the semantic names we use
 * across the editor chrome to their Hugeicons equivalents so callers can
 * write `<Icon name="cursor" size={16} />` and not think about it.
 *
 * Lucide-react is still in use elsewhere in the app for things this set
 * doesn't yet cover; the migration is incremental.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  CropIcon,
  Cursor02Icon,
  Delete01Icon,
  Download01Icon,
  EyeIcon,
  HandGrabIcon,
  Image01Icon,
  Layers01Icon,
  LineIcon,
  Logout01Icon,
  MagicWand01Icon,
  MenuSquareIcon,
  MoreHorizontalIcon,
  Note02Icon,
  Package01Icon,
  PencilIcon,
  PlusSignIcon,
  RectangularIcon,
  RulerIcon,
  Setting07Icon,
  Shapes01Icon,
  Share01Icon,
  StickyNote01Icon,
  Target02Icon,
  TickDouble01Icon,
  TextIcon,
  UploadCircle01Icon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";

export const ICON_MAP = {
  add: Add01Icon,
  back: ArrowLeft01Icon,
  forward: ArrowRight01Icon,
  copy: Copy01Icon,
  crop: CropIcon,
  cursor: Cursor02Icon,
  trash: Delete01Icon,
  download: Download01Icon,
  eye: EyeIcon,
  "eye-off": ViewOffIcon,
  hand: HandGrabIcon,
  image: Image01Icon,
  layers: Layers01Icon,
  line: LineIcon,
  signout: Logout01Icon,
  ai: MagicWand01Icon,
  menu: MenuSquareIcon,
  more: MoreHorizontalIcon,
  note: Note02Icon,
  "sticky-note": StickyNote01Icon,
  inventory: Package01Icon,
  edit: PencilIcon,
  plus: PlusSignIcon,
  measure: RulerIcon,
  settings: Setting07Icon,
  shape: Shapes01Icon,
  share: Share01Icon,
  rect: RectangularIcon,
  check: TickDouble01Icon,
  text: TextIcon,
  upload: UploadCircle01Icon,
  calibrate: Target02Icon,
} as const;

export type IconName = keyof typeof ICON_MAP;

export function Icon({
  name,
  size = 16,
  className,
  strokeWidth = 1.5,
  ...rest
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
} & React.SVGProps<SVGSVGElement>) {
  const icon = ICON_MAP[name];
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...(rest as any)}
    />
  );
}
