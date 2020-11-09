import { LitElement, customElement, property, TemplateResult, html, css, CSSResult, PropertyValues } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { HomeAssistant, LovelaceCardConfig, createThing, LovelaceCard } from 'custom-card-helpers';
import { StackInCardConfig } from './types';
import * as pjson from '../package.json';

console.info(
  `%c STACK-IN-CARD \n%c   Version ${pjson.version}   `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

@customElement('stack-in-card')
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class StackInCard extends LitElement implements LovelaceCard {
  @property() protected _card?: LovelaceCard;

  @property() private _config?: StackInCardConfig;

  private _hass?: HomeAssistant;

  private _cardPromise: Promise<LovelaceCard> | undefined;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._card) {
      this._card.hass = hass;
    }
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        overflow: hidden;
      }
    `;
  }

  public setConfig(config: StackInCardConfig): void {
    if (!config.cards) {
      throw new Error(`There is no cards parameter defined`);
    }
    this._config = {
      mode: 'vertical',
      ...config,
      keep: {
        background: false,
        margin: false,
        box_shadow: false,
        border_radius: false,
        ...config.keep,
      },
    };
    if (this._config.keep?.margin && this._config.keep?.outer_padding === undefined)
      this._config.keep.outer_padding = true;
    this._createStack();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!this._card) return;
    this._waitForChildren(this._card, false);
    window.setTimeout(() => {
      if (!this._config?.keep?.background) this._waitForChildren(this._card, true);
      if (this._config?.keep?.outer_padding && this._card?.shadowRoot) {
        const stackRoot = this._card.shadowRoot.getElementById('root');
        if (stackRoot) stackRoot.style.padding = '8px';
      }
    }, 500);
  }

  private async _createStack() {
    this._cardPromise = this._createCard({
      type: `${this._config!.mode}-stack`,
      cards: this._config!.cards,
    });

    this._card = await this._cardPromise;
  }

  protected render(): TemplateResult {
    if (!this._hass || !this._config) {
      return html``;
    }

    return html`
      <ha-card header=${ifDefined(this._config.title)}>
        <div>${this._card}</div>
      </ha-card>
    `;
  }

  private _updateStyle(e: LovelaceCard | null, withBg: boolean): void {
    if (!e) return;
    if (!this._config?.keep?.box_shadow) e.style.boxShadow = 'none';
    if (
      !this._config?.keep?.background &&
      withBg &&
      getComputedStyle(e).getPropertyValue('--keep-background').trim() !== 'true'
    ) {
      e.style.background = 'transparent';
    }
    if (!this._config?.keep?.border_radius) e.style.borderRadius = '0';
  }

  private _loopChildren(e: LovelaceCard, withBg: boolean): void {
    const searchElements = e.childNodes;
    searchElements.forEach((childE) => {
      if ((childE as Element).tagName === 'STACK-IN-CARD') return;
      if (!this._config?.keep?.margin && (childE as LovelaceCard).style) {
        (childE as LovelaceCard).style.margin = '0px';
      }
      this._waitForChildren(childE as LovelaceCard, withBg);
    });
  }

  private _updateChildren(element: LovelaceCard | undefined, withBg: boolean): void {
    if (!element) return;
    if (element.shadowRoot) {
      const card = element.shadowRoot.querySelector('ha-card') as LovelaceCard;
      if (!card) {
        // if (element.shadowRoot.querySelector('stack-in-card')) return;
        const searchEles = element.shadowRoot.getElementById('root') || element.shadowRoot.getElementById('card');
        if (!searchEles) return;
        this._loopChildren(searchEles as LovelaceCard, withBg);
      } else {
        this._updateStyle(card, withBg);
      }
    } else {
      if (typeof element.querySelector === 'function' && element.querySelector('ha-card')) {
        this._updateStyle(element.querySelector('ha-card'), withBg);
      }
      this._loopChildren(element as LovelaceCard, withBg);
    }
  }

  private _waitForChildren(element: LovelaceCard | undefined, withBg: boolean): void {
    if (((element as unknown) as LitElement).updateComplete) {
      ((element as unknown) as LitElement).updateComplete.then(() => {
        this._updateChildren(element, withBg);
      });
    } else {
      this._updateChildren(element, withBg);
    }
  }

  private async _createCard(config: LovelaceCardConfig): Promise<LovelaceCard> {
    let element: LovelaceCard;
    if (HELPERS) {
      element = (await HELPERS).createCardElement(config);
    } else {
      element = createThing(config);
    }
    if (this._hass) {
      element.hass = this._hass;
    }
    if (element) {
      element.addEventListener(
        'll-rebuild',
        (ev) => {
          ev.stopPropagation();
          this._rebuildCard(element, config);
        },
        { once: true },
      );
    }
    return element;
  }

  private async _rebuildCard(element: LovelaceCard, config: LovelaceCardConfig): Promise<LovelaceCard> {
    const newCard = await this._createCard(config);
    element.replaceWith(newCard);
    this._card = newCard;
    window.setTimeout(() => {
      if (!this._config?.keep?.background) this._waitForChildren(this._card, true);
      if (this._config?.keep?.outer_padding && this._card?.shadowRoot) {
        const stackRoot = this._card.shadowRoot.getElementById('root');
        if (stackRoot) stackRoot.style.padding = '8px';
      }
    }, 500);
    return newCard;
  }

  public async getCardSize(): Promise<number> {
    await this._cardPromise;
    if (!this._card) {
      return 0;
    }
    return await this._computeCardSize(this._card);
  }

  private _computeCardSize(card: LovelaceCard): number | Promise<number> {
    if (typeof card.getCardSize === 'function') {
      return card.getCardSize();
    }
    if (customElements.get(card.localName)) {
      return 1;
    }
    return customElements.whenDefined(card.localName).then(() => this._computeCardSize(card));
  }
}
