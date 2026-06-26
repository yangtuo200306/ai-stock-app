import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AskMessage } from './ask';

export type RootTabParamList = {
  自选: undefined;
  问股:
    | {
        sessionId?: string;
        initialQuestion?: string;
        initialMessages?: AskMessage[];
      }
    | undefined;
  记录: undefined;
  我的: NavigatorScreenParams<MineStackParamList> | undefined;
};

export type WatchlistStackParamList = {
  Watchlist: undefined;
  TaskStatus: { taskId: string; stockCode: string };
  RecordDetail: { recordId: number };
  ReportDetail: { reportId: number };
};

export type RecordStackParamList = {
  RecordList: undefined;
  RecordDetail: { recordId: number };
  ReportDetail: { reportId: number };
};

export type MineStackParamList = {
  Mine: undefined;
  Login: undefined;
};
