import {validateFilters,statisticsQuery} from './models/statisticsModel.js';
import {getLanguage} from './i18n/i18n.js';
import {installLocalizedNavigation} from './i18n/routes.js';
import {translateStatic,languagePicker,readLanguageTransfer} from './i18n/languageView.js';
import './styles/main.css';
import './styles/detail.css';
import './styles/layout.css';
import './styles/filters.css';
import './styles/navigation.css';
import './styles/player.css';
import { createHeroModel } from './models/heroModel.js';
import { createHeroView } from './views/heroView.js';
import { createHeroController } from './controllers/heroController.js';
import { createOverfastService } from './services/heroService.js';
import { createFavoritesStorage } from './storage/favoritesStorage.js';
import { createStatisticsService } from './services/statisticsService.js';
import { createHeroDetailService } from './services/heroDetailService.js';
import {createPerkStatisticsService} from './services/perkStatisticsService.js';
import { createHeroDetailView } from './views/heroDetailView.js';
import { createRoutingController } from './controllers/routingController.js';
import { createInsightView } from './views/insightView.js';
import { createSnapshotService } from './services/snapshotService.js';
import { createMapService } from './services/mapService.js';
import { createMapStatisticsController } from './controllers/mapStatisticsController.js';
import { selectMetaPolicy } from './domain/metaPolicies.js';
import {createFilterStorage} from './storage/filterStorage.js';
import {createOfficialPatchModel} from './models/officialPatchModel.js';
import {createOfficialPatchService} from './services/officialPatchService.js';

translateStatic();installLocalizedNavigation({base:import.meta.env.BASE_URL});
const storage = createFavoritesStorage();
const saved = storage.load();
const view = createHeroView();
const model = createHeroModel(saved.keys,{metaPolicy:selectMetaPolicy({development:import.meta.env.DEV,experiment:import.meta.env.VITE_META_EXPERIMENT})});
const filterStorage=createFilterStorage(),savedFilters=filterStorage.load();if(savedFilters)model.state.statsFilters=savedFilters;
const transfer=readLanguageTransfer();
if(transfer){try{model.state.statsFilters=validateFilters(transfer.statsFilters);for(const key of ['query','role','sort','favoritesOnly'])if(typeof transfer[key]===typeof model.state[key])model.state[key]=transfer[key];if(transfer.statistics?.expiresAt>Date.now()&&statisticsQuery(transfer.statistics.filters)===statisticsQuery(model.state.statsFilters)&&Array.isArray(transfer.statistics.records)){Object.assign(model.state,{statistics:transfer.statistics,statsStatus:transfer.statsStatus,previousSnapshot:transfer.previousSnapshot,snapshotStatus:transfer.snapshotStatus});}}catch{}}
document.querySelector('#hero-search').value=model.state.query;
languagePicker({model,base:import.meta.env.BASE_URL});
const detailView = createHeroDetailView();
const patchModel=createOfficialPatchModel();
const snapshots = createSnapshotService({ base: import.meta.env.BASE_URL });
const statisticsService=createStatisticsService();
const mapService=createMapService();
const mapStatisticsController=createMapStatisticsController({statisticsService,onChange:()=>router.refresh()});
const router = createRoutingController({ model, detailService: createHeroDetailService(), detailView, historyService: snapshots, mapStatisticsController,perkStatisticsService:createPerkStatisticsService({base:import.meta.env.BASE_URL}),patchModel });
const insights = createInsightView({patchModel});
createOfficialPatchService({base:import.meta.env.BASE_URL}).getNotes().then(data=>{patchModel.set(data);router.refresh();insights.render(model);}).catch(error=>{patchModel.fail(error);insights.render(model);});
if (!saved.available) view.notify('저장된 즐겨찾기를 읽지 못했습니다. 이번 방문에서 새로 선택할 수 있습니다.');
router.start();
createHeroController({ model, view, service: createOverfastService(), statisticsService, snapshotService: snapshots,mapService, storage,filterStorage,
  onStateChange() { router.refresh(); insights.render(model); },
  onHeroSelect(key) { location.hash = `/heroes/${key}`; },
}).start();
