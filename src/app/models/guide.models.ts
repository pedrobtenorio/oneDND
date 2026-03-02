export interface GuideItem {
  id: string;
  name: string;
  description: string;
}

export interface GuideCategory {
  id: string;
  title: string;
  items: GuideItem[];
}
