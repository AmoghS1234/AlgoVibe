const svg = d3.select("#graph");
const visualizeBtn = document.getElementById("visualizeBtn");
const resetBtn = document.getElementById("resetBtn");
const exampleBtn = document.getElementById("exampleBtn");

const problemModal = document.getElementById("problemModal");
const sampleModal = document.getElementById("sampleModal");
const collabModal = document.getElementById("collabModal");

document.getElementById("problemBtn").onclick = () => problemModal.style.display = "block";
document.getElementById("sampleBtn").onclick = () => sampleModal.style.display = "block";
document.getElementById("collabBtn").onclick = () => collabModal.style.display = "block";

document.getElementById("closeProblem").onclick = () => problemModal.style.display = "none";
document.getElementById("closeSample").onclick = () => sampleModal.style.display = "none";
document.getElementById("closeCollab").onclick = () => collabModal.style.display = "none";

window.onclick = e => {
  if (e.target === problemModal) problemModal.style.display = "none";
  if (e.target === sampleModal) sampleModal.style.display = "none";
  if (e.target === collabModal) collabModal.style.display = "none";
};

let running = false;

exampleBtn.addEventListener("click", () => {
  document.getElementById("nodes").value = 6;
  document.getElementById("edges").value = "1 2\n2 3\n4 5\n5 6";
});

resetBtn.addEventListener("click", () => {
  running = false;
  svg.selectAll("*").remove();
  document.getElementById("nodes").value = "";
  document.getElementById("edges").value = "";
  document.getElementById("legend").innerHTML = "";
});

visualizeBtn.addEventListener("click", () => {
  const n = parseInt(document.getElementById("nodes").value);
  const edgesText = document.getElementById("edges").value.trim();
  if (!n || !edgesText) return alert("Please enter students and connections.");

  const edges = edgesText.split("\n").map(line => line.trim().split(" ").map(Number));
  runVisualization(n, edges);
});

function computeComponents(adj, n) {
  const visited = Array(n + 1).fill(false);
  let count = 0;
  for (let i = 1; i <= n; i++) {
    if (!visited[i]) {
      count++;
      const stack = [i];
      visited[i] = true;
      while (stack.length) {
        const node = stack.pop();
        for (const nb of adj[node]) {
          if (!visited[nb]) {
            visited[nb] = true;
            stack.push(nb);
          }
        }
      }
    }
  }
  return count;
}

async function runVisualization(n, edges) {
  running = true;
  svg.selectAll("*").remove();

  const adj = Array.from({ length: n + 1 }, () => []);
  for (const [u, v] of edges) {
    if (!adj[u].includes(v)) adj[u].push(v);
    if (!adj[v].includes(u)) adj[v].push(u);
  }

  const colors = ["#00b3ff","#00ff66","#ff3366","#a855f7","#facc15","#14b8a6"];
  const total = computeComponents(adj, n);

  drawLegend(colors, total);
  svg.append("text")
    .attr("x", 280).attr("y", 30)
    .attr("fill", "#00ff66").attr("font-size", "20px")
    .style("text-shadow","0 0 5px #00ff66")
    .text(`Friend Groups: ${total}`);

  // Arrange nodes in circular layout
  const centerX = 350, centerY = 280, radius = 200;
  const nodes = Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI / n) * i;
    return {
      id: i + 1,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  const links = edges.map(([u, v]) => ({
    source: nodes[u - 1],
    target: nodes[v - 1]
  }));

  // Draw static base edges
  svg.selectAll(".link")
    .data(links).enter().append("line")
    .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
    .attr("stroke", "#005577")
    .attr("stroke-width", 2)
    .attr("stroke-linecap", "round");

  // Draw nodes
  const node = svg.selectAll(".node")
    .data(nodes).enter().append("g").attr("class","node");
  node.append("circle").attr("r", 18).attr("fill", "#0b1a2b").attr("stroke", "#00ffff");
  node.append("text").attr("text-anchor","middle").attr("dy",6).attr("fill","#00ffff").text(d=>d.id);
  node.attr("transform", d => `translate(${d.x},${d.y})`);

  const visited = Array(n + 1).fill(false);
  const ANIM_DURATION = 350;

  async function dfs(start, color) {
    if (!running) return;
    visited[start] = true;
    const nodeEl = node.nodes()[start - 1];
    d3.select(nodeEl).select("circle")
      .transition().duration(ANIM_DURATION)
      .attr("fill", color)
      .style("filter",`drop-shadow(0 0 8px ${color})`);
    await new Promise(r=>setTimeout(r,ANIM_DURATION));
    for (const nb of adj[start]) {
      if (!visited[nb]) {
        const edge = links.find(l => (l.source.id===start&&l.target.id===nb)||(l.source.id===nb&&l.target.id===start));
        if (edge) {
          svg.append("line").attr("x1",edge.source.x).attr("y1",edge.source.y)
            .attr("x2",edge.source.x).attr("y2",edge.source.y)
            .attr("stroke",color).attr("stroke-width",4)
            .transition().duration(ANIM_DURATION)
            .attr("x2",edge.target.x).attr("y2",edge.target.y)
            .attr("stroke-opacity",0).remove();
        }
        await dfs(nb, color);
      }
    }
  }

  let ci = 0;
  for (let i = 1; i <= n; i++) {
    if (!visited[i]) await dfs(i, colors[ci++ % colors.length]);
  }
  running = false;

  // ⚡ Start dot flow animation on all edges
  startFlowingDots(links);
}

// Function to create continuously flowing dots
function startFlowingDots(links) {
  links.forEach((link, i) => {
    createFlow(link, i * 200); // staggered start
  });
}

function createFlow(link, delay) {
  const color = "#00ffff";

  const dot = svg.append("circle")
    .attr("r", 3)
    .attr("fill", color)
    .style("filter", `drop-shadow(0 0 6px ${color})`);

  function animateDot() {
    dot.attr("cx", link.source.x)
       .attr("cy", link.source.y)
       .transition()
       .delay(delay)
       .duration(2000)
       .ease(d3.easeLinear)
       .attr("cx", link.target.x)
       .attr("cy", link.target.y)
       .on("end", animateDot); // loop animation
  }

  animateDot();
}

function drawLegend(colors, count) {
  const legend = d3.select("#legend");
  legend.selectAll("*").remove();
  for (let i = 0; i < count; i++) {
    const item = legend.append("div").attr("class","legend-item");
    item.append("span").style("background",colors[i % colors.length]);
    item.append("span").text(`Group ${i+1}`);
  }
}
