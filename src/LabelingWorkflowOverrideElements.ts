import { Id64String } from "@bentley/bentleyjs-core";
import { RgbColor } from "@bentley/imodeljs-common";
import { FeatureOverrideProvider, FeatureSymbology, Viewport } from "@bentley/imodeljs-frontend";
import { MachineLearningElementOverrideData } from "./store/LabelingWorkflowTypes";


export class LabelingWorflowOverrideElements implements FeatureOverrideProvider {

    public readonly viewport: Viewport;
    public overrides: FeatureSymbology.Overrides | undefined;

    /** Constructor */
    private constructor(vp: Viewport) {
        this.viewport = vp;
        vp.featureOverrideProvider = this;
        vp.isFadeOutActive = true;

        this.overrides = this.initOverrides();
    }

    /** Clean up */
    public dispose(): void {
        this.viewport.featureOverrideProvider = undefined;
        this.viewport.isFadeOutActive = false;
    }

    /** Override Provider Initialization */
    public static getOrCreate(vp: Viewport): LabelingWorflowOverrideElements {
        let provider = vp.featureOverrideProvider instanceof LabelingWorflowOverrideElements ? vp.featureOverrideProvider : undefined;
        if (provider === undefined) {
            return new LabelingWorflowOverrideElements(vp);
        }
        return provider;
    }

    /** Override Provider Initialization */
    public static get(vp: Viewport): LabelingWorflowOverrideElements | undefined {
        return vp.featureOverrideProvider instanceof LabelingWorflowOverrideElements ? vp.featureOverrideProvider : undefined;
    }

    
    /** The overrides applied to the tiles from the *secondary* IModelConnection, to draw only deleted elements. */
    private initOverrides(): FeatureSymbology.Overrides {
        const ovrs = new FeatureSymbology.Overrides(this.viewport);
        return ovrs;
    }

    private data?: MachineLearningElementOverrideData[];
    
    /** Establish active feature overrides to emphasize elements and apply color/transparency overrides.
     * @see [[Viewport.featureOverrideProvider]]
     */
    public addFeatureOverrides(overrides: FeatureSymbology.Overrides, vp: Viewport): void {
        if (this.data === undefined) { 
            return; 
        }
        overrides.setDefaultOverrides(FeatureSymbology.Appearance.defaults);
        this.data.forEach((entry: MachineLearningElementOverrideData) => {
            if (entry.colorOverride !== undefined || entry.isTransparent || entry.isEmphasized) {
                const app = FeatureSymbology.Appearance.fromJSON({ 
                    rgb: entry.colorOverride !== undefined ? RgbColor.fromColorDef(entry.colorOverride) : undefined, 
                    transparency: entry.isTransparent ? 0.95 : undefined, 
                    emphasized: entry.isEmphasized ? true : undefined, 
                    nonLocatable: entry.isTransparent ? true : undefined,
                });
                overrides.overrideElement(entry.elementId, app);
            }
        });

    }

    /** Set storage to compute overrides */
    public setElementData(data: MachineLearningElementOverrideData[]): void {
        this.data = data;
        const hiddenSet = new Set<Id64String>();
        for (const entry of data) {
            if (!entry.isVisible) {
                hiddenSet.add(entry.elementId);
            }
        }
        this.viewport.setNeverDrawn(hiddenSet);
    }

}

