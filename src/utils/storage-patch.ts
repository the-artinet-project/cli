import { FileStore } from "@artinet/sdk";
import { logger } from "./logger.js";

export class PatchedFileStore extends FileStore {
  constructor(path: string) {
    super(path);
  }
  async setState(taskId: string, state: any) {
    return await super.setState(taskId, state).catch((error) => {
      logger.log("error setting state: ", error);
      return null as any;
    });
  }
  async getState(taskId: string) {
    return await super.getState(taskId).catch((error) => {
      logger.log("error getting state: ", error);
      return null as any;
    });
  }
}
