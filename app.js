"use strict";

(() => {
  const API_BASE = 'https://restcountries.com/v3.1/all?fields=name,population,region,currencies'

  const status = document.getElementById('status')
  const output = document.getElementById('output')
  const input = document.getElementById('q')
  const form = document.getElementById('searchForm')
  const btnAll = document.getElementById('btnAll')

  const state = { countries: null }

  const setBusy = b => output.setAttribute('aria-busy', String(b))
  const showStatus = (msg, err = false) => {
    status.classList.remove('d-none', 'alert-info', 'alert-danger')
    if (!msg) {
      status.classList.add('d-none')
      status.textContent = ''
      return
    }
    status.classList.add(err ? 'alert-danger' : 'alert-info')
    status.textContent = msg
  }

  const number = n => Number(n || 0)
  const fmt = n => number(n).toLocaleString('en-US')

  const getData = url => fetch(url).then(r => r.json())

  const loadAll = async () => {
    if (Array.isArray(state.countries)) return state.countries
    const data = await getData(`${API_BASE}/all?fields=name,population,region,currencies`)
    state.countries = data
    return data
  }

  const fetchAll = loadAll

  const fetchByName = async name => {
    const list = await loadAll()
    const term = name.trim().toLowerCase()
    if (!term) return list
    return list.filter(c =>
      (c?.name?.common || '').toLowerCase().includes(term)
    )
  }

  const groupBy = (arr, keyFn) =>
    arr.reduce((m, x) => {
      const k = keyFn(x)
      m.set(k, (m.get(k) || 0) + 1)
      return m
    }, new Map())

  const compute = items => {
    const list = Array.isArray(items) ? items : []
    const totalCountries = list.length
    const totalPopulation = list.reduce((s, c) => s + number(c.population), 0)
    const avgPopulation = totalCountries ? Math.round(totalPopulation / totalCountries) : 0

    const byCountry = list.map(c => ({
      name: c?.name?.common || 'Unknown',
      pop: number(c.population)
    }))

    const byRegion = groupBy(list, c => c?.region || 'Unknown')

    const byCurrency = list.reduce((m, c) => {
      Object.keys(c?.currencies || {}).forEach(code => {
        m.set(code, (m.get(code) || 0) + 1)
      })
      return m
    }, new Map())

    return { totalCountries, totalPopulation, avgPopulation, byCountry, byRegion, byCurrency }
  }

  const tableHTML = (headers, rows) => {
    const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`
    const tbody = `<tbody>${rows.map(cols => `<tr>${cols.map(td => `<td>${td}</td>`).join('')}</tr>`).join('')}</tbody>`
    return `<table class="table table-sm table-striped align-middle">${thead}${tbody}</table>`
  }

  const kpiBox = (label, value) =>
    `<div class="col">
       <div class="border rounded p-3 text-center bg-light">
         <div class="text-muted small">${label}</div>
         <div class="fs-5 mono">${value}</div>
       </div>
     </div>`

  const card = (title, inner) =>
    `<div class="col-12 col-lg-6">
       <div class="card h-100">
         <div class="card-body">
           <h2 class="h5 card-title">${title}</h2>
           ${inner}
         </div>
       </div>
     </div>`

  const render = countries => {
    const { totalCountries, totalPopulation, avgPopulation, byCountry, byRegion, byCurrency } =
      compute(countries)

    const kpis =
      `<div class="row g-2">
         ${kpiBox('Total countries in result', fmt(totalCountries))}
         ${kpiBox('Total population', fmt(totalPopulation))}
         ${kpiBox('Average population', fmt(avgPopulation))}
       </div>`

    const countriesRows = byCountry.map(({ name, pop }) => [name, `<span class="mono">${fmt(pop)}</span>`])
    const regionsRows = Array.from(byRegion.entries()).map(([r, n]) => [r, `<span class="mono">${fmt(n)}</span>`])
    const currencyRows = Array.from(byCurrency.entries()).map(([c, n]) => [c, `<span class="mono">${fmt(n)}</span>`])

    const html =
      card('Overview', kpis) +
      card('Countries and population', tableHTML(['Country', 'Population'], countriesRows)) +
      card('Regions breakdown', tableHTML(['Region', 'Countries'], regionsRows)) +
      card('Currencies usage', tableHTML(['Currency code', 'Countries using'], currencyRows))

    output.innerHTML = html
  }

 const run = async fn => {
    setBusy(true)
    try {
      const data = await fn()
      render(data)
    } catch {
      output.innerHTML = ''
    } finally {
      setBusy(false)
    }
  }

  btnAll.addEventListener('click', () => run(fetchAll))
  form.addEventListener('submit', e => {
    e.preventDefault()
    const name = input.value.trim()
    if (!name) return
    run(() => fetchByName(name))
  })
})()
