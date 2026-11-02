import './styles/main.css';
import './styles/detail.css';
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

const storage = createFavoritesStorage();
const saved = storage.load();
const view = createHeroView();
const model = createHeroModel(saved.keys);
const detailView = createHeroDetailView();
const router = createRoutingController({ model, detailService: createHeroDetailService(), detailView });
const insights = createInsightView();
if (!saved.available) view.notify('저장된 즐겨찾기를 읽지 못했습니다. 이번 방문에서 새로 선택할 수 있습니다.');
router.start();
createHeroController({ model, view, service: createOverfastService(), statisticsService: createStatisticsService(), snapshotService: createSnapshotService({ base: import.meta.env.BASE_URL }), storage,
  onStateChange() { router.refresh(); insights.render(model); },
  onHeroSelect(key) { location.hash = `/heroes/${key}`; },
}).start();
