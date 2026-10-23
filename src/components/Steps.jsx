const steps = [
  ['drop your file', 'pdf, word, slides, notes or a quizlet export.'],
  ['tweak the cards', "edit terms, delete the fluff, add your own. it's your deck."],
  ['flip & learn', 'study mode with shuffle, progress and keyboard shortcuts.'],
]

export default function Steps() {
  return (
    <section className="section" id="how">
      <div className="section-head reveal">
        <p className="eyebrow">how it works</p>
        <h2 className="display">three steps. that's it.</h2>
      </div>
      <div className="steps">
        {steps.map(([title, text], i) => (
          <div className="step reveal" key={title}>
            <span className="step-num display">{i + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
