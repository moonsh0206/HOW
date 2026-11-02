import './styles/main.css';
import { createHeroModel } from './models/heroModel.js';
import { createHeroView } from './views/heroView.js';
import { createHeroController } from './controllers/heroController.js';
import { createOverfastService } from './services/heroService.js';
import { createFavoritesStorage } from './storage/favoritesStorage.js';
import { createStatisticsService } from './services/statisticsService.js';

const storage = createFavoritesStorage();
const saved = storage.load();
const view = createHeroView();
if (!saved.available) view.notify('저장된 즐겨찾기를 읽지 못했습니다. 이번 방문에서 새로 선택할 수 있습니다.');
createHeroController({ model: createHeroModel(saved.keys), view, service: createOverfastService(), statisticsService: createStatisticsService(), storage }).start();
