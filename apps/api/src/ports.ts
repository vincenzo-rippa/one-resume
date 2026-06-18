export interface ContentRepository {
  getContent(path: string): Promise<string>;
}
