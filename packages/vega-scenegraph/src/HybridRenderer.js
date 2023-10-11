import Renderer from './Renderer';
import SVGRenderer from './SVGRenderer';
import CanvasRenderer from './CanvasRenderer';
import {inherits} from 'vega-util';
import {domChild} from './util/dom';

const OPTS = {svgMarkTypes: ['text']};

export function setHybridRendererOptions(svgMarkTypes, debug) {
  OPTS['svgMarkTypes'] = svgMarkTypes;
  OPTS['debug'] = debug ?? false;
}

export default function HybridRenderer(loader) {
  Renderer.call(this, loader);
  this._svgRenderer = new SVGRenderer(loader);
  this._canvasRenderer = new CanvasRenderer(loader);
}

const base = Renderer.prototype;

inherits(HybridRenderer, Renderer, {
  /**
   * Initialize a new HybridRenderer instance.
   * @param {DOMElement} el - The containing DOM element for the display.
   * @param {number} width - The coordinate width of the display, in pixels.
   * @param {number} height - The coordinate height of the display, in pixels.
   * @param {Array<number>} origin - The origin of the display, in pixels.
   *   The coordinate system will be translated to this point.
   * @param {number} [scaleFactor=1] - Optional scaleFactor by which to multiply
   *   the width and height to determine the final pixel size.
   * @return {HybridRenderer} - This renderer instance.
   */
  initialize(el, width, height, origin, scaleFactor) {
    this._root_el = domChild(el, 0, 'div');
    this._canvasEl = domChild(this._root_el, 0, 'div');
    this._svgEl = domChild(this._root_el, 1, 'div');

    this._root_el.style.position = 'relative';

    // Set position absolute to overlay svg on top of canvas
    if (!OPTS.debug) {
      this._canvasEl.style.height = '100%';
      this._svgEl.style.position = 'absolute';
      this._svgEl.style.top = '0';
      this._svgEl.style.left = '0';
      this._svgEl.style.height = '100%';
      this._svgEl.style.width = '100%';
    }

    // pointer-events to none on SVG layer so that canvas gets all events
    this._svgEl.style.pointerEvents = 'none';

    this._canvasRenderer.initialize(this._canvasEl, width, height, origin, scaleFactor);
    this._svgRenderer.initialize(this._svgEl, width, height, origin, scaleFactor);
    return base.initialize.call(this, el, width, height, origin, scaleFactor);
  },

  /**
   * Flag a mark item as dirty.
   * @param {Item} item - The mark item.
   */
  dirty(item) {
    if (OPTS.svgMarkTypes.includes(item.mark.marktype)) {
      this._svgRenderer.dirty(item);
    } else {
      this._canvasRenderer.dirty(item);
    }
    return this;
  },

  /**
   * Internal rendering method.
   * @param {object} scene - The root mark of a scenegraph to render.
   * @param {Array} markTypes - Array of the mark types to render.
   *                            If undefined, render all mark types
   */
  _render(scene, markTypes) {
    const allMarkTypes = markTypes ?? [
      'arc', 'area', 'image', 'line', 'path', 'rect', 'rule', 'shape', 'symbol', 'text', 'trail'
    ];
    const canvasMarkTypes = allMarkTypes.filter((m) => !OPTS.svgMarkTypes.includes(m));
    this._svgRenderer.render(scene, OPTS.svgMarkTypes);
    this._canvasRenderer.render(scene, canvasMarkTypes);
  },

  /**
   * Resize the display.
   * @param {number} width - The new coordinate width of the display, in pixels.
   * @param {number} height - The new coordinate height of the display, in pixels.
   * @param {Array<number>} origin - The new origin of the display, in pixels.
   *   The coordinate system will be translated to this point.
   * @param {number} [scaleFactor=1] - Optional scaleFactor by which to multiply
   *   the width and height to determine the final pixel size.
   * @return {SVGRenderer} - This renderer instance;
   */
  resize(width, height, origin, scaleFactor) {
    base.resize.call(this, width, height, origin, scaleFactor);
    this._svgRenderer.resize(width, height, origin, scaleFactor);
    this._canvasRenderer.resize(width, height, origin, scaleFactor);
    return this;
  },

  background(bgcolor) {
    // Propagate background color to lower canvas renderer
    this._canvasRenderer.background(bgcolor);
    return this;
  },
});
