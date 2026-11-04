import './styles/main.css';
import './styles/detail.css';
import './styles/layout.css';
import { createHeroModel } from './models/heroModel.js';
import { createHeroView } from './views/heroView.js';
import { createHeroController } from './controllers/heroController.js';
import { createOverfastService } from './services/heroService.js';
import { createFavoritesStorage } from './storage/favoritesStorage.js';
import { createStatisticsService } from './services/statisticsService.js';
import { createHeroDetailService } from './services/heroDetailService.js';
import { createHeroDetailView } from './views/heroDetailView.js';
import { createRoutingController } from './controllers/routingController.js';
import { createInsightView } from './views/insightView.js';
import { createSnapshotService } from './services/snapshotService.js';
import { createMapService } from './services/mapService.js';
import { createMapStatisticsController } from './controllers/mapStatisticsController.js';

const storage = createFavoritesStorage();
const saved = storage.load();
const view = createHeroView();
const model = createHeroModel(saved.keys);
const detailView = createHeroDetailView();
const snapshots = createSnapshotService({ base: import.meta.env.BASE_URL });
const statisticsService=createStatisticsService();
const mapService=createMapService();
const mapStatisticsController=createMapStatisticsController({statisticsService,onChange:()=>router.refresh()});
const router = createRoutingController({ model, detailService: createHeroDetailService(), detailView, historyService: snapshots, mapStatisticsController });
const insights = createInsightView();
if (!saved.available) view.notify('저장된 즐겨찾기를 읽지 못했습니다. 이번 방문에서 새로 선택할 수 있습니다.');
router.start();
createHeroController({ model, view, service: createOverfastService(), statisticsService, snapshotService: snapshots,mapService, storage,
  onStateChange() { router.refresh(); insights.render(model); },
  onHeroSelect(key) { location.hash = `/heroes/${key}`; },
}).start();
