import os

import cherrypy
import requests

from app.abyss import (
    bioacoustic_classifier,
    build_a_creature,
    copernicus,
    dataset_comparison,
    depth_comparisons,
    depth_zones,
    edna,
    emodnet,
    evolution_explorer,
    evolution_sim,
    food_web,
    gbif,
    habitats,
    hydrothermal_vents,
    knowledge_base,
    marine_anatomy,
    microbial_ocean,
    microscope,
    mystery_species,
    nereus,
    nereus_context,
    ocean_chemistry,
    ocean_coverage,
    ocean_layers,
    ocean_sounds,
    ocean_vs_space,
    paleo_ocean,
    provenance_graph,
    real_expeditions,
    reef_twin,
    scale_explorer,
    species,
    species_images,
    taxonomy_tree,
    the_unknown,
)
from app.abyss.http import CONFIDENCE_LEVELS, envelope
from app.db import get_session
from app.models import AbyssSavedItem, DataSource


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except requests.exceptions.Timeout:
        raise cherrypy.HTTPError(504, "Upstream ocean/marine data service timed out")
    except requests.exceptions.RequestException as exc:
        raise cherrypy.HTTPError(502, f"Upstream ocean/marine data service failed: {exc}")


class AbyssStatusController:
    """Foundation status endpoint — confirms Abyss's backend scaffold (cache,
    license registry, provenance envelope) is wired up, and exposes the
    fixed confidence vocabulary the frontend renders everywhere."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        with get_session() as session:
            source_count = session.query(DataSource).filter_by(module="abyss").count()
            enabled_count = session.query(DataSource).filter_by(module="abyss", enabled=True).count()
        return envelope(
            source="Astilo",
            source_dataset="abyss_status",
            external_id=None,
            data={
                "phase": "Phase 1 — Foundation",
                "confidenceLevels": list(CONFIDENCE_LEVELS),
                "registeredDataSources": source_count,
                "enabledDataSources": enabled_count,
            },
            confidence="CURATED",
        )


class DataSourceRegistryController:
    """Read-only view of the license registry (Abyss rule: every data source
    must retain provider, license, attribution, source and terms URLs,
    retrieval date). GET only — the registry is seeded/maintained server-side,
    not user-editable."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, module=None, enabled=None):
        with get_session() as session:
            query = session.query(DataSource)
            if module:
                query = query.filter_by(module=module)
            if enabled is not None:
                query = query.filter_by(enabled=enabled.strip().lower() in ("1", "true", "yes"))
            rows = query.order_by(DataSource.provider).all()
            return {"dataSources": [row.to_dict() for row in rows]}


class SpeciesSearchController:
    """Name search across WoRMS (Abyss's taxonomy authority) — returns
    candidate species for a scientific or common name query."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, limit=10):
        if not q:
            raise cherrypy.HTTPError(400, "q is required (e.g. ?q=octopus)")
        return _guard(species.search_species, q, int(limit))


class SpeciesProfileController:
    """A single species' full profile: WoRMS taxonomy + classification +
    distribution, and real OBIS occurrence records — Astilo's unified
    species object (blueprint section 55), each field independently
    traceable via its own provenance envelope."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, aphiaId=None):
        if not aphiaId:
            raise cherrypy.HTTPError(400, "aphiaId is required")
        result = _guard(species.species_profile, int(aphiaId))
        if result is None:
            raise cherrypy.HTTPError(404, f"No WoRMS record found for AphiaID {aphiaId}")
        return result


class SpeciesGbifOccurrenceController:
    """Supplementary occurrence records from GBIF, already filtered to only
    license-compliant datasets — kept separate from the OBIS-based profile
    so the two sources' counts can be compared rather than silently merged."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, scientificName=None, limit=50):
        if not scientificName:
            raise cherrypy.HTTPError(400, "scientificName is required")
        return _guard(gbif.search_occurrences, scientificName, int(limit))


class OceanLayerCatalogController:
    """Static catalog of keyless ocean map layers (satellite imagery +
    bathymetry) the frontend's Ocean Explorer map renders as tile overlays."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return ocean_layers.list_layers()


class OceanDepthController:
    """Real seafloor depth at a clicked map point, via EMODnet Bathymetry."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, lat=None, lon=None):
        if lat is None or lon is None:
            raise cherrypy.HTTPError(400, "lat and lon are required")
        return _guard(emodnet.depth_at_point, float(lat), float(lon))


def _guard_copernicus(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except RuntimeError as exc:
        raise cherrypy.HTTPError(502, str(exc))


class OceanHeatController:
    """Real, live sea temperature depth profile from Copernicus Marine."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, lat=None, lon=None):
        if lat is None or lon is None:
            raise cherrypy.HTTPError(400, "lat and lon are required")
        return _guard_copernicus(copernicus.temperature_profile, float(lat), float(lon))


class SalinityController:
    """Real, live salinity depth profile from Copernicus Marine."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, lat=None, lon=None):
        if lat is None or lon is None:
            raise cherrypy.HTTPError(400, "lat and lon are required")
        return _guard_copernicus(copernicus.salinity_profile, float(lat), float(lon))


class OceanCurrentController:
    """Real, live surface current speed/direction from Copernicus Marine."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, lat=None, lon=None):
        if lat is None or lon is None:
            raise cherrypy.HTTPError(400, "lat and lon are required")
        return _guard_copernicus(copernicus.surface_current, float(lat), float(lon))


class TaxonomyChildrenController:
    """Real WoRMS children for a taxon — powers the Interactive Taxonomy
    Tree's on-demand expand."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, aphiaId=None):
        aphia_id = int(aphiaId) if aphiaId else taxonomy_tree.ANIMALIA_APHIA_ID
        return _guard(taxonomy_tree.children, aphia_id)


class EvolutionRelativesController:
    """Real sibling taxa (shared-parent relatives) for the Evolution
    Explorer."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, parentAphiaId=None):
        if not parentAphiaId:
            raise cherrypy.HTTPError(400, "parentAphiaId is required")
        return _guard(evolution_explorer.relatives, int(parentAphiaId))


class EvolutionDivergenceController:
    """A curated divergence-time estimate for two named clades, or UNKNOWN
    if Astilo has no verified estimate for that pair."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, taxonA=None, taxonB=None):
        if not taxonA or not taxonB:
            raise cherrypy.HTTPError(400, "taxonA and taxonB are required")
        return evolution_explorer.divergence(taxonA, taxonB)


class MarineAnatomySpeciesController:
    """The fixed species list for the Marine Anatomy Explorer."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return marine_anatomy.list_species()


class MarineAnatomyDiagramsController:
    """Real, license-verified anatomical diagrams for one species, resolved
    live from Wikimedia Commons."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, speciesId=None):
        if not speciesId:
            raise cherrypy.HTTPError(400, "speciesId is required")
        result = _guard(marine_anatomy.diagrams_for_species, speciesId)
        if result is None:
            raise cherrypy.HTTPError(404, "Unknown speciesId")
        return result


class HabitatCatalogController:
    """The curated Habitat Explorer catalog."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return habitats.list_habitats()


class HydrothermalVentOverviewController:
    """The curated Hydrothermal Vent Explorer content."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return hydrothermal_vents.overview()


class MicrobialOceanController:
    """The curated Microbial Ocean / Plankton Universe content."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return microbial_ocean.overview()


class ScaleExplorerController:
    """The curated Scale Explorer size comparison."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return scale_explorer.list_scale()


class CoverageIndexController:
    """The Astilo Data Coverage Index (Ocean Knowledge Map) — a documented,
    log-scaled transform of real OBIS regional record counts."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return _guard(ocean_coverage.coverage_index)


class TheUnknownController:
    """The Unknown — poorly-sampled regions, genuinely rare species (real
    live OBIS counts), and curated unresolved-taxonomy examples."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return _guard(the_unknown.overview)


class DepthComparisonController:
    """Curated real depth-vs-mountain-elevation reference points."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return depth_comparisons.list_comparisons()


class DepthZoneCatalogController:
    """The fixed reference list of depth zones and their curated real
    species associations, for the Depth Descent experience."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return depth_zones.list_zones()


class DepthPhysicsController:
    """The zone and hydrostatic pressure for a given depth — a model
    (formula-based), not an observed measurement."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, depth=None):
        if depth is None:
            raise cherrypy.HTTPError(400, "depth is required")
        return depth_zones.describe_depth(float(depth))


class DepthEncounterController:
    """A simulated discovery-mode encounter at a given depth — see
    depth_zones.random_encounter for why this is confidence=SIMULATED."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, depth=None):
        if depth is None:
            raise cherrypy.HTTPError(400, "depth is required")
        return depth_zones.random_encounter(float(depth))


class SoundCatalogController:
    """Real NOAA Fisheries marine-mammal recordings for the Ocean
    Soundscape / Spectrogram Explorer."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return ocean_sounds.list_clips()


class BioacousticClassifyController:
    """Classifies a catalog sound clip with YAMNet — a real local model, but
    a general sound-event classifier, not a species identifier. Always
    confidence=AI_INFERRED, never implying a confirmed species ID."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, clipId=None):
        if not clipId:
            raise cherrypy.HTTPError(400, "clipId is required")
        clip = next((c for c in ocean_sounds.CLIPS if c["id"] == clipId), None)
        if not clip:
            raise cherrypy.HTTPError(404, "Unknown clip id")

        resp = requests.get(clip["url"], timeout=30)
        if resp.status_code != 200:
            raise cherrypy.HTTPError(502, f"Upstream audio fetch failed ({resp.status_code})")
        suffix = os.path.splitext(clip["url"])[1] or ".mp3"

        try:
            result = bioacoustic_classifier.classify_audio_bytes(resp.content, suffix)
        except Exception as exc:
            raise cherrypy.HTTPError(502, f"Classifier failed: {exc}")

        data = {"clipId": clipId, "commonName": clip["commonName"], **result}
        return envelope("Astilo (local YAMNet model)", "yamnet_v1_audioset", clipId, data, confidence="AI_INFERRED")


class SoundProxyController:
    """Streams a NOAA Fisheries sound clip through our own server. NOAA's S3
    bucket sends no CORS headers, so a Web Audio AnalyserNode attached
    directly to the clip from the browser gets silently zeroed
    (cross-origin-tainted) data — fetching it here and re-streaming from our
    own origin (which does send CORS headers, see cors_tool in server.py)
    fixes that for the Spectrogram Explorer. Takes a catalog id, never an
    arbitrary URL, so this can't be used as an open proxy."""

    exposed = True

    def GET(self, id=None):
        clip = next((c for c in ocean_sounds.CLIPS if c["id"] == id), None)
        if not clip:
            raise cherrypy.HTTPError(404, "Unknown sound clip id")

        upstream = requests.get(clip["url"], stream=True, timeout=30)
        if upstream.status_code != 200:
            raise cherrypy.HTTPError(502, f"Upstream audio fetch failed ({upstream.status_code})")

        cherrypy.response.headers["Content-Type"] = upstream.headers.get("Content-Type", "audio/mpeg")
        content_length = upstream.headers.get("Content-Length")
        if content_length:
            cherrypy.response.headers["Content-Length"] = content_length

        def stream():
            for chunk in upstream.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk
            upstream.close()

        return stream()

    GET._cp_config = {"response.stream": True}


class OceanChemistryController:
    """Curated approximate chemistry reference values by depth zone."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return ocean_chemistry.list_chemistry()


class EdnaSampleController:
    """Generates one simulated eDNA Detective sample — see edna.py for why
    this is confidence=SIMULATED end to end."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return edna.generate_sample()


class RealExpeditionCatalogController:
    """The curated catalog of real, verified ocean exploration programs."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return real_expeditions.list_programs()


class ProvenanceGraphController:
    """The species -> dataset provenance graph, each branch joined against
    the License Registry for its real citation/license."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, aphiaId=None):
        if not aphiaId:
            raise cherrypy.HTTPError(400, "aphiaId is required")
        result = _guard(provenance_graph.build_graph, int(aphiaId))
        if result is None:
            raise cherrypy.HTTPError(404, f"No WoRMS record found for AphiaID {aphiaId}")
        return result


class RegionalCoverageController:
    """Real OBIS record/species/dataset counts per ocean region — Abyss's
    Observation Gap Finder."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return _guard(ocean_coverage.regional_coverage)


class DatasetComparisonController:
    """Compares real OBIS vs GBIF occurrence totals for one species."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, scientificName=None):
        if not scientificName:
            raise cherrypy.HTTPError(400, "scientificName is required")
        return _guard(dataset_comparison.compare, scientificName)


class PaleoOceanController:
    """The curated real paleontology timeline."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return paleo_ocean.list_eras()


class OceanVsSpaceController:
    """The curated Earth-vs-Europa-vs-Enceladus comparison."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return ocean_vs_space.list_worlds()


class KnowledgeBaseStatusController:
    """Whether Nereus's local RAG index has been built, and how big it is."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return envelope("Astilo", "knowledge_base_status", None, knowledge_base.status(), confidence="CURATED")


class KnowledgeBaseBuildController:
    """(Re)builds the local RAG index from real Wikipedia article text. An
    explicit, on-demand action — not run automatically on server start,
    since it makes ~30 real Wikipedia requests and recomputes the whole
    TF-IDF index."""

    exposed = True

    @cherrypy.tools.json_out()
    def POST(self):
        try:
            result = knowledge_base.build_index()
        except RuntimeError as exc:
            raise cherrypy.HTTPError(502, str(exc))
        return envelope("Astilo", "knowledge_base_build", None, result, confidence="CURATED")


class NereusStatusController:
    """Whether Nereus's local Ollama backend is reachable right now."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return nereus.status()


class NereusAskController:
    """Asks Nereus a question in a given mode, with real retrieved context
    built from whatever the user is currently looking at (depth, selected
    species) — see nereus_context.build_context."""

    exposed = True

    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        question = body.get("question")
        mode = body.get("mode", "ask")
        context_payload = body.get("context") or {}
        if not question:
            raise cherrypy.HTTPError(400, "question is required")
        if not isinstance(context_payload, dict):
            raise cherrypy.HTTPError(400, "context must be an object")
        sources = nereus_context.build_context(context_payload, question=question)
        return nereus.ask(question, mode, sources)


class SpeciesImageController:
    """A real, license-verified lead image for any topic (species, taxon,
    habitat) — used anywhere Abyss shows an illustrative photo. Returns
    data: null (not an error) when no appropriately-licensed image exists,
    which the frontend must treat as "no image available", not a failure."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, title=None):
        if not title:
            raise cherrypy.HTTPError(400, "title is required")
        image = _guard(species_images.fetch_licensed_image, title)
        return envelope("Wikimedia Commons", "pageimages + imageinfo", title, image, confidence="OBSERVED" if image else "UNKNOWN")


class FoodWebGraphController:
    """The fixed reference food-web graph."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return food_web.graph()


class FoodWebSimulateController:
    """Runs the Ecosystem Disruption Simulator — see food_web.simulate for
    why this is confidence=SIMULATED."""

    exposed = True

    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        changes = body.get("changes")
        if not isinstance(changes, dict) or not changes:
            raise cherrypy.HTTPError(400, "changes (an object of nodeId -> percent change) is required")
        try:
            changes = {k: float(v) for k, v in changes.items()}
        except (TypeError, ValueError):
            raise cherrypy.HTTPError(400, "changes values must be numbers")
        return food_web.simulate(changes)


class ReefTwinSimulateController:
    """Runs the Reef Digital Twin — see reef_twin.simulate for why this is
    confidence=SIMULATED."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, tempDelta=0, phDelta=0, pollution=0, fishing=0, years=10):
        return reef_twin.simulate(float(tempDelta), float(phDelta), float(pollution), float(fishing), int(years))


class CreatureEvaluateController:
    """Evaluates a Build-a-Creature design against its chosen environment."""

    exposed = True

    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        environment = body.get("environment")
        traits = body.get("traits")
        if not isinstance(environment, dict) or not isinstance(traits, dict):
            raise cherrypy.HTTPError(400, "environment and traits objects are required")
        return build_a_creature.evaluate(environment, traits)


class EvolutionRunController:
    """Runs the Evolution Simulator — see evolution_sim.run for why this is
    confidence=SIMULATED."""

    exposed = True

    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        generations = body.get("generations", 50)
        pressures = body.get("pressures") or {}
        if not isinstance(pressures, dict):
            raise cherrypy.HTTPError(400, "pressures must be an object")
        return evolution_sim.run(int(generations), pressures)


class MicroscopeSampleCatalogController:
    """The fixed sample-type and magnification catalog for the Virtual
    Microscope."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return microscope.list_samples()


class MicroscopeSpecimensController:
    """Real, licensed reference images for a given sample type."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, sampleId=None):
        if not sampleId:
            raise cherrypy.HTTPError(400, "sampleId is required")
        result = microscope.specimens_for_sample(sampleId)
        if result is None:
            raise cherrypy.HTTPError(404, "Unknown sampleId")
        return result


class MysteryPuzzleController:
    """A new Mystery Species puzzle — evidence checklist + candidate
    options, with the answer kept server-side (see mystery_species.py)."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return mystery_species.new_puzzle()


class MysteryGuessController:
    """Checks a guess against a puzzle's server-held answer."""

    exposed = True

    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        puzzle_id = body.get("puzzleId")
        scientific_name = body.get("scientificName")
        if not puzzle_id or not scientific_name:
            raise cherrypy.HTTPError(400, "puzzleId and scientificName are required")
        result = mystery_species.guess(puzzle_id, scientific_name)
        if result is None:
            raise cherrypy.HTTPError(404, "Unknown or expired puzzleId")
        return result


class AbyssCodexController:
    """A user's Abyss Codex — species, occurrences, habitats, etc. saved for
    later, with source provenance kept alongside. Mirrors
    CosmosLibraryController's shape."""

    exposed = True

    VALID_TYPES = ("species", "occurrence", "habitat", "expedition", "sound")

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, object_type=None, collection=None):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            query = session.query(AbyssSavedItem).filter_by(user_id=user_id)
            if object_type:
                query = query.filter_by(object_type=object_type)
            if collection:
                query = query.filter_by(collection=collection)
            return [item.to_dict() for item in query.order_by(AbyssSavedItem.created_at.desc()).all()]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        user_id = int(cherrypy.request.user["sub"])
        body = cherrypy.request.json or {}
        object_type = body.get("objectType")
        external_id = str(body.get("externalId", ""))

        if object_type not in self.VALID_TYPES or not external_id:
            raise cherrypy.HTTPError(400, f"objectType ({'|'.join(self.VALID_TYPES)}) and externalId are required")

        with get_session() as session:
            existing = session.query(AbyssSavedItem).filter_by(
                user_id=user_id, object_type=object_type, external_id=external_id
            ).first()
            if existing:
                return existing.to_dict()

            item = AbyssSavedItem(
                user_id=user_id,
                object_type=object_type,
                external_id=external_id,
                collection=body.get("collection") or "codex",
                title=body.get("title"),
                source=body.get("source"),
                source_dataset=body.get("sourceDataset"),
                image_url=body.get("imageUrl"),
                data_json=body.get("data"),
                notes=body.get("notes"),
            )
            session.add(item)
            session.flush()
            return item.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, item_id):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            item = session.query(AbyssSavedItem).filter_by(id=int(item_id), user_id=user_id).first()
            if not item:
                raise cherrypy.HTTPError(404, "Saved item not found")
            session.delete(item)
            return {"deleted": True}
