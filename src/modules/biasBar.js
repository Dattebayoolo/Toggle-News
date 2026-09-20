// Authentic Ground News Style Bias Barometer
// US Edition standard: Blue (Left), White/Neutral (Center), Red (Right)

export function renderBiasBar(biasDistribution, options = {}) {
  const { showLabels = true, height = 7, showPercentageText = true, interactive = true } = options;
  const { left = 33, center = 34, right = 33 } = biasDistribution;

  return `
    <div class="gn-bias-bar-component" ${interactive ? `title="Bias Distribution — Left: ${left}% | Center: ${center}% | Right: ${right}%"` : ''}>
      ${showLabels ? `
        <div class="gn-bias-labels-row">
          <div class="gn-bias-label left">
            <span class="gn-bias-indicator-dot left"></span>
            <span class="gn-bias-name">Left</span>
            ${showPercentageText ? `<span class="gn-bias-pct">${left}%</span>` : ''}
          </div>
          <div class="gn-bias-label center">
            <span class="gn-bias-indicator-dot center"></span>
            <span class="gn-bias-name">Center</span>
            ${showPercentageText ? `<span class="gn-bias-pct">${center}%</span>` : ''}
          </div>
          <div class="gn-bias-label right">
            <span class="gn-bias-indicator-dot right"></span>
            <span class="gn-bias-name">Right</span>
            ${showPercentageText ? `<span class="gn-bias-pct">${right}%</span>` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="gn-bias-track" style="height: ${height}px;">
        <div class="gn-bias-seg seg-left" style="width: ${left}%;" title="Left Coverage: ${left}%"></div>
        <div class="gn-bias-seg seg-center" style="width: ${center}%;" title="Center Coverage: ${center}%"></div>
        <div class="gn-bias-seg seg-right" style="width: ${right}%;" title="Right Coverage: ${right}%"></div>
      </div>
    </div>
  `;
}
