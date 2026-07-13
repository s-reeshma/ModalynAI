import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import mermaid from 'mermaid';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState, 
  useEdgesState 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Editor from '@monaco-editor/react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Sandpack } from '@codesandbox/sandpack-react';
import ReactECharts from 'echarts-for-react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Canvas } from 'reaflow';
import { motion, AnimatePresence } from 'framer-motion';
import API from "../api";
import "../styles/Learn.css";
import Sidebar from "../components/Sidebar";

// --- 1. Library Initialization ---
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
});

// --- 2. Sub-Components (Defined OUTSIDE the main function) ---

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ef4444', padding: '1.5rem', border: '1px solid #ef4444', borderRadius: '8px', background: 'var(--bg-panel)', marginTop: '1rem' }}>
          <h4>⚠️ Visual Component Crashed</h4>
          <p>The AI generated malformed visual data that couldn't be parsed.</p>
          <pre style={{ fontSize: '0.85rem', overflow: 'auto', marginTop: '0.5rem', color: 'var(--text-main)' }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children; 
  }
}

const ConceptMapRenderer = ({ data }) => {
  let mapData = data;
  if (typeof mapData === 'string') {
    try { mapData = JSON.parse(mapData); } catch (e) { console.error("Invalid ConceptMap payload", e); }
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(mapData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(mapData?.edges || []);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  if (!mapData?.nodes) return <p>Loading concept map...</p>;

  return (
    <div style={{ height: '500px', width: '100%', border: '1px solid #ccc', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

const MermaidChart = ({ code, darkMode }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!code) return;
    
    mermaid.initialize({
      startOnLoad: false,
      theme: darkMode ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: "system-ui, sans-serif",
      themeVariables: {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px"
      }
    });
    
    const render = async () => {
      let cleanCode = "";
      try {
        cleanCode = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        const isValid = await mermaid.parse(cleanCode);
        
        if (isValid) {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, cleanCode);
          if (ref.current) ref.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("CRITICAL MERMAID RENDER ERROR:", err);
        if (ref.current) {
          ref.current.innerHTML = `<div style="color:red; padding: 1rem; border: 1px solid red; border-radius: 8px;">Diagram syntax error. Showing raw code:<br/><pre style="background: #f4f4f4; padding: 10px; margin-top: 10px; color: black; border-radius: 4px; overflow-x: auto;">${cleanCode || code}</pre></div>`;
        }
      }
    };
    render();
  }, [code, darkMode]);

  return <div className="mermaid-chart" ref={ref} style={{ width: "100%", display: "flex", justifyContent: "center", minHeight: "300px" }} />;
};

const RechartsRenderer = ({ data }) => {
  let chartData = data;
  if (typeof chartData === 'string') {
    try { chartData = JSON.parse(chartData); } catch (e) { console.error("Invalid Recharts payload", e); }
  }

  if (!chartData || !chartData.type) return <p>Invalid chart data.</p>;
  
  if (chartData.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chartData.xAxisKey || "name"} />
          <YAxis />
          <Tooltip />
          <Legend />
          {chartData.lines?.map((line, i) => (
            <Line key={i} type="monotone" dataKey={line.dataKey} stroke={line.stroke || "#8884d8"} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  } else if (chartData.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chartData.xAxisKey || "name"} />
          <YAxis />
          <Tooltip />
          <Legend />
          {chartData.bars?.map((bar, i) => (
            <Bar key={i} dataKey={bar.dataKey} fill={bar.fill || "#8884d8"} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return <p>Unsupported chart type.</p>;
};

const EChartsRenderer = ({ data, darkMode }) => {
  if (!data) return <p>Loading chart...</p>;
  
  let option = data;
  if (typeof option === 'string') {
    try { option = JSON.parse(option); } catch (e) { throw new Error("Invalid ECharts payload: Unparsable string"); }
  }
  option = option.option || option;
  
  if (Array.isArray(option)) {
    // AI hallucinated echarts engine but gave cytoscape array
    if (option.length > 0 && option[0].data) {
      return <CytoscapeRenderer data={option} />;
    }
    throw new Error("Invalid ECharts payload: Array received instead of object");
  }
  
  if (!option || typeof option !== 'object') {
    throw new Error("Invalid ECharts payload: Expected object");
  }

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} theme={darkMode ? "dark" : "light"} />;
};

const CytoscapeRenderer = ({ data }) => {
  if (!data) return <p>Loading network...</p>;
  
  let elements = data;
  if (typeof elements === 'string') {
    try { elements = JSON.parse(elements); } catch (e) { throw new Error("Invalid Cytoscape payload: Unparsable string"); }
  }
  elements = elements.elements || elements;
  
  if (!Array.isArray(elements)) {
    if (elements && (elements.nodes || elements.edges)) {
      elements = [
        ...(elements.nodes || []),
        ...(elements.edges || [])
      ];
    } else {
      throw new Error("Invalid Cytoscape data format: elements must be an array or object containing nodes/edges");
    }
  }

  return (
    <CytoscapeComponent 
      elements={elements} 
      style={{ width: '100%', height: '400px', border: '1px solid var(--border-color)', borderRadius: '8px', background: "var(--bg-panel)" }} 
      layout={{ name: 'cose' }} 
    />
  );
};

const ReaflowRenderer = ({ data }) => {
  if (!data) return <p>Loading flow...</p>;
  let flowData = data;
  if (typeof flowData === 'string') {
    try { flowData = JSON.parse(flowData); } catch (e) { throw new Error("Invalid Reaflow payload: Unparsable string"); }
  }
  if (!flowData || !flowData.nodes || !flowData.edges) {
    throw new Error("Invalid Reaflow payload: Missing nodes/edges");
  }

  return (
    <div style={{ height: '400px', width: '100%', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: "var(--bg-panel)" }}>
      <Canvas nodes={flowData.nodes} edges={flowData.edges} fit={true} />
    </div>
  );
};

const FramerMotionRenderer = ({ data }) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  if (!data) return <p>Loading animation...</p>;
  let animData = data;
  if (typeof animData === 'string') {
    try { animData = JSON.parse(animData); } catch (e) { throw new Error("Invalid Framer payload"); }
  }
  
  const frames = animData.frames || [];
  if (!frames.length) return <p>No frames provided for animation.</p>;

  return (
    <div style={{ minHeight: '300px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', overflow: 'hidden' }}>
      
      <h3 style={{ color: 'var(--text-main)', textAlign: 'center', minHeight: '60px' }}>
        {frames[currentFrame].title}
      </h3>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', minHeight: '100px' }}>
        <AnimatePresence mode="popLayout">
          {frames[currentFrame].items?.map((item) => (
            <motion.div
              key={item} // Key must be the item string for layout animations to track it
              layout
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{
                padding: '1rem 2rem',
                background: 'var(--primary-color)',
                color: '#fff',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {item}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Animation Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button 
          className="primary-btn" 
          disabled={currentFrame === 0} 
          onClick={() => setCurrentFrame(f => f - 1)}
        >
          ⬅️ Previous
        </button>
        <button 
          className="primary-btn" 
          disabled={currentFrame === frames.length - 1} 
          onClick={() => setCurrentFrame(f => f + 1)}
        >
          Next Step ➡️
        </button>
      </div>
    </div>
  );
};
// --- Cartridges ---
const StoryboardEngine = ({ data }) => {
  if (!data) return <p>Loading storyboard...</p>;
  let storyboardData = data;
  if (typeof storyboardData === 'string') {
    try { storyboardData = JSON.parse(storyboardData); } catch (e) { throw new Error("Invalid Storyboard payload: Unparsable string"); }
  }
  if (!storyboardData.items) return <p>Loading storyboard...</p>;

  return (
    <div key={JSON.stringify(storyboardData.items)} style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', width: '100%', minHeight: '300px', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2rem', justifyContent: 'center', alignItems: 'stretch' }}>
      {storyboardData.items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.2 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-card)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '150px',
            maxWidth: '220px',
            textAlign: 'center',
            border: '1px solid var(--border-color)',
            flex: '1 1 150px'
          }}
        >
          {item.icon && <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{item.icon}</div>}
          {item.text && <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)', wordWrap: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{item.text}</div>}
        </motion.div>
      ))}
    </div>
  );
};

const ProcessEngine = ({ data }) => {
  if (!data) return <p>Loading process...</p>;
  let processData = data;
  if (typeof processData === 'string') {
    try { processData = JSON.parse(processData); } catch (e) { throw new Error("Invalid Process payload: Unparsable string"); }
  }
  if (!processData.steps) return <p>Loading process...</p>;

  return (
    <div key={JSON.stringify(processData.steps)} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '150px', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2rem' }}>
      {processData.steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.3 }}
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--primary-color)',
            color: 'white',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
          }}
        >
          {step}
        </motion.div>
      ))}
    </div>
  );
};

const ENGINE_REGISTRY = {
  "StoryboardEngine": StoryboardEngine,
  "ProcessEngine": ProcessEngine,
  "echarts": EChartsRenderer,
  "mermaid": MermaidChart,
  "framer_motion": FramerMotionRenderer,
  "reactflow": ConceptMapRenderer,
  "recharts": RechartsRenderer,
  "cytoscape": CytoscapeRenderer,
  "reaflow": ReaflowRenderer
};

const SortableItem = ({ id, content }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '1rem',
    margin: '0.5rem 0',
    background: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'grab',
    color: '#333'
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {content}
    </div>
  );
};

const DragAndDropList = ({ initialItems }) => {
  const [items, setItems] = useState(initialItems || []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px' }}>
      <h4 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Drag and Drop to Reorder</h4>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} content={item.content} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

const SpeechInput = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);
  
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.onerror = (e) => console.error("Speech Error", e);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  return (
    <button 
      onClick={startListening} 
      style={{ 
        background: isListening ? '#ef4444' : 'var(--bg-panel)', 
        color: isListening ? '#fff' : 'var(--text-main)',
        border: '1px solid var(--border-color)',
        padding: '0.75rem 1.5rem',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '1rem'
      }}
    >
      {isListening ? "🎙️ Listening (Speak now)..." : "🎤 Speak Answer"}
    </button>
  );
};

const ContentRenderer = ({ content, modality, darkMode }) => {
  if (!content) return null;

  const renderModality = () => {
    // AI sometimes hallucinates content.type (e.g. "neural_network_processing")
    // Always use the strictly defined modality first!
    const type = modality || content.type;

    const playTTS = (text) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      } else {
        alert("Text-to-speech is not supported in this browser.");
      }
    };

    switch (type) {
      case "visual":
        const EngineComponent = ENGINE_REGISTRY[content.engine];
        return (
          <div className="visual-media" style={{ marginTop: "1rem", background: "var(--bg-panel)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
            <ErrorBoundary>
              {EngineComponent ? (
                content.engine === "mermaid" ? (
                  <MermaidChart code={content.payload?.code || content.payload} darkMode={darkMode} />
                ) : content.engine === "echarts" ? (
                  <EChartsRenderer data={content.payload} darkMode={darkMode} />
                ) : (
                  <EngineComponent data={content.payload} />
                )
              ) : (
                <EChartsRenderer data={content.payload} darkMode={darkMode} />
              )}
            </ErrorBoundary>
          </div>
        );
      case "auditory":
        return (
          <div className="audio-media" style={{ background: "var(--bg-panel)", padding: "1.5rem", borderRadius: "12px", marginTop: "1rem", border: "1px solid var(--border-color)" }}>
            <p style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>🎙️ <strong>Audio Script:</strong> {content.audio_script}</p> 
            
            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
              <button 
                className="primary-btn" 
                style={{ padding: "0.5rem 1rem", borderRadius: "8px" }} 
                onClick={() => playTTS(content.audio_script)}
              >
                🔊 Play TTS (Native)
              </button>
            </div>
            
            {content.audio_url && (
              <div style={{ marginTop: "1rem" }}>
                <audio controls style={{ width: "100%" }}>
                  <source src={`http://127.0.0.1:8000${content.audio_url}`} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        );
      case "read_write":
        return (
          <div className="text-media" style={{ background: "var(--bg-panel)", padding: "1.5rem", borderRadius: "12px", marginTop: "1rem", border: "1px solid var(--border-color)" }}>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {content.markdown_content || (content.bullet_points ? content.bullet_points.join('\n\n') : content.explanation)}
            </ReactMarkdown>
            {content.deep_dive_text && <p style={{ marginTop: "1rem" }}>{content.deep_dive_text}</p>}
          </div>
        );
      case "kinesthetic":
        const isCodeTask = content.task_json?.engine === "monaco" || content.task_json?.code_snippet;
        const isDndTask = content.task_json?.engine === "dnd";
        const isSandpackTask = content.task_json?.engine === "sandpack";
        
        return (
          <div className="kinesthetic-task" style={{ background: "var(--bg-panel)", color: "var(--text-main)", padding: "1.5rem", borderRadius: "12px", marginTop: "1rem", border: "1px solid var(--border-color)", fontFamily: "monospace" }}>
            <h4 style={{ color: "var(--accent-color)", marginBottom: "1rem" }}>Interactive Exercise</h4>
            <p style={{ marginBottom: "1rem" }}>{content.task_json?.task_setup || content.task_json?.prompt || "Task:"}</p>
            
            {isDndTask && (
              <DragAndDropList initialItems={content.task_json?.items || []} />
            )}

            {isCodeTask && (
              <div style={{ background: "#252526", padding: "1rem", borderRadius: "8px", border: "1px solid #333", height: "300px" }}>
                <Editor
                  height="100%"
                  defaultLanguage={content.task_json?.language || "javascript"}
                  theme="vs-dark"
                  defaultValue={content.task_json?.code_snippet || content.task_json?.code || "// Your code here"}
                />
              </div>
            )}
            
            {isSandpackTask && (
              <div style={{ marginTop: "1rem", borderRadius: "8px", overflow: "hidden" }}>
                <Sandpack 
                  template={content.task_json?.template || "react"} 
                  files={content.task_json?.files || {}} 
                  theme={darkMode ? "dark" : "light"}
                  options={{ showNavigator: true, showTabs: true }}
                />
              </div>
            )}

            {!isCodeTask && !isDndTask && !isSandpackTask && (
              <div style={{ background: "var(--bg-card)", padding: "1rem", borderRadius: "8px", overflowX: "auto", border: "1px solid var(--border-color)" }}>
                <pre><code>{content.task_json?.code_snippet || content.task_json?.code || "No instructions provided"}</code></pre>
              </div>
            )}

            <details style={{ marginTop: "1rem", cursor: "pointer" }}>
              <summary style={{ color: "#ce9178", fontWeight: "bold" }}>Reveal Solution</summary>
              <div style={{ marginTop: "0.5rem", padding: "1rem", background: "#252526", borderRadius: "8px", border: "1px solid #333" }}>
                 <pre><code>{content.task_json?.solution || content.task_json?.correct_answer || "No solution provided"}</code></pre>
              </div>
            </details>
          </div>
        );
      case "read_write":
        return (
          <div className="read-write-content" style={{ background: "var(--bg-panel)", padding: "1.5rem", borderRadius: "12px", marginTop: "1rem", border: "1px solid var(--border-color)" }}>
            <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
              {content.bullet_points?.map((bp, i) => <li key={i} style={{ marginBottom: "0.5rem" }}>{bp}</li>)}
            </ul>
            <div style={{ background: "rgba(0,0,0,0.02)", padding: "1rem", borderLeft: "4px solid var(--primary-color)", borderRadius: "4px" }}>
              <p style={{ margin: 0, fontStyle: "italic" }}>{content.deep_dive_text}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="step-content">
      <p style={{ fontSize: "1.1rem", lineHeight: "1.7", marginBottom: "1rem" }}>{content.explanation}</p>
      
      {content.analogy && (
        <div className="analogy-section" style={{ background: "var(--bg-panel)", padding: "1rem", borderRadius: "8px", borderLeft: "4px solid var(--accent-color)", margin: "1rem 0" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--accent-color)" }}>💡 Analogy</h4>
          <p style={{ margin: 0 }}>{content.analogy}</p>
        </div>
      )}

      {content.example && (
        <div className="example-section" style={{ background: "var(--bg-panel)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)", margin: "1rem 0" }}>
          <h4 style={{ margin: "0 0 0.5rem 0" }}>📝 Example</h4>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{content.example}</pre>
        </div>
      )}

      {renderModality()}
    </div>
  );
};

// --- 3. Main Application Component ---

function Learn() {
  const { topic } = useParams();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(localStorage.getItem("theme") === "dark");
  const [inputTopic, setInputTopic] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Preparing your lesson...");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const endOfLessonRef = useRef(null);

  useEffect(() => {
    let interval;
    if (loading) {
      const messages = [
        "Analyzing knowledge graph...",
        "Structuring your curriculum...",
        "Generating custom analogies...",
        "Rendering interactive diagrams...",
        "Adapting to your learning style...",
        "Finalizing the lesson..."
      ];
      let i = 0;
      setLoadingText(messages[0]);
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingText(messages[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (data && endOfLessonRef.current) {
      endOfLessonRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [data]);

  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceResult, setPracticeResult] = useState(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);

  const [history, setHistory] = useState([]);
  const email = localStorage.getItem("userEmail");
  const [lessonHistory, setLessonHistory] = useState([]);

  const fetchLesson = async (t) => {
    try {
      setLoading(true);
      setData(null);
      setLessonHistory([]);
      setPracticeAnswer("");
      setPracticeResult(null);
      const res = await API.post("/teach", { email, topic: t });
      setData(res.data);
      await fetchFullHistoryForTopic(t); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFullHistoryForTopic = async (t) => {
    if (!email || !t) return;
    try {
      setLoading(true);
      const encodedEmail = encodeURIComponent(email);
      const encodedTopic = encodeURIComponent(t);
      const response = await API.get(`/history/${encodedEmail}?topic=${encodedTopic}`);
      if (response.data?.steps) {
        setLessonHistory(response.data.steps);
      } else {
        setLessonHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = async () => {
    if (!practiceAnswer.trim()) return;
    try {
      setCheckingAnswer(true);
      const practiceQ = data?.response?.practice_question || data?.response?.practice;
      const res = await API.post("/practice-check", {
        email,
        topic,
        question: practiceQ,
        answer: practiceAnswer,
      });
      setPracticeResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingAnswer(false);
    }
  };

  useEffect(() => {
    if (!loading) return;
    const phrases = [
      "Synthesizing curriculum...",
      "Building interactive models...",
      "Applying learning styles...",
      "Structuring data graphs...",
      "Finalizing lesson...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % phrases.length;
      setLoadingText(phrases[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleFeedback = async (type) => {
    if (feedbackSending) return;
    try {
      setFeedbackSending(true);
      const res = await API.post("/feedback", {
        email,
        topic,
        feedback: type,
        text: feedbackText,
      });
      setFeedbackText("");
      
      // If the user requested a completely new topic, navigate to it!
      if (res.data.new_topic) {
        navigate(`/learn/${res.data.new_topic}`);
      } else {
        // Otherwise, fetch the next step for the current topic
        fetchLesson(topic);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFeedbackSending(false);
    }
  };

  const gotonext = async () => {
    fetchLesson(topic);
  };

  const fetchHistory = async () => {
    if (!email) return;
    try {
      const response = await API.get(`/history/${encodeURIComponent(email)}`);
      if (response.data?.history) {
        setHistory(response.data.history);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch sidebar history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
    if (topic) {
      fetchFullHistoryForTopic(topic);
    }
  }, [topic]);

  const handleStart = () => {
    if (!inputTopic.trim()) return;
    navigate(`/learn/${inputTopic}`);
  };

  const latestStep = lessonHistory.length > 0 ? lessonHistory[lessonHistory.length - 1] : null;
  const currentPracticeQuestion = data?.response?.practice_question || data?.response?.practice || latestStep?.content?.practice_question || latestStep?.content?.practice;

  return (
    <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
      
      {/* LEFT SIDEBAR */}
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* CENTER CONTENT AND RIGHT SIDEBAR WRAPPER */}
      <div className="learn-page-wrapper">
        {/* CENTER CONTENT AREA */}
        <main className="main-content learn-main">
        
        {/* START SCREEN */}
        {!topic && !data && (
          <div className="start-screen">
            <h1>What do you want to learn?</h1>
            <input
              value={inputTopic}
              onChange={(e) => setInputTopic(e.target.value)}
              placeholder="Enter a topic (e.g. Recursion, API design, Data Structures)"
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
            <button className="primary-btn" onClick={handleStart}>
              Start Learning
            </button>
          </div>
        )}

        {/* LESSON HISTORY */}
        {topic && (
          <div className="lesson-wrapper">
            {lessonHistory.map((step, index) => {
              // Extract inner content because step.content stores the whole wrapper dict
              const innerContent = step.content?.content || step.content;
              return (
                <div key={index} className="card">
                  <h2>Step {step.step || index + 1}</h2>
                  <ContentRenderer content={innerContent} modality={step.modality} darkMode={darkMode} />
                </div>
              );
            })}

            {loading && (
              <div className="loading">
                <h3 style={{ margin: 0 }}>{loadingText}</h3>
                <div className="spinner"></div> 
                <p>Modalyn AI is dynamically generating your content.</p>
              </div>
            )}

            {/* Practice Block */}
            {currentPracticeQuestion && (
              <div className="card">
                <h2>Practice</h2>
                <p>{currentPracticeQuestion}</p>
                <textarea
                  className="feedback-input"
                  placeholder="Write your answer here, or use the microphone to speak..."
                  value={practiceAnswer}
                  onChange={(e) => setPracticeAnswer(e.target.value)}
                />
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="primary-btn" onClick={checkAnswer} disabled={checkingAnswer} style={{ marginTop: '1rem' }}>
                    {checkingAnswer ? "Checking..." : "Submit Answer"}
                  </button>
                  <SpeechInput onResult={(text) => setPracticeAnswer(prev => prev ? prev + " " + text : text)} />
                </div>
                {practiceResult && (
                  <div className={`practice-result ${practiceResult.correct ? 'correct' : 'incorrect'}`} style={{
                    marginTop: '1rem', padding: '1rem', borderRadius: '8px',
                    border: `1px solid ${practiceResult.correct ? '#10b981' : '#ef4444'}`,
                    background: practiceResult.correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                  }}>
                    <p style={{ fontWeight: "600", marginBottom: "0.5rem", color: practiceResult.correct ? '#10b981' : '#ef4444' }}>
                      {practiceResult.correct ? "Correct! Great job." : "Not quite right. Let's review!"}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>{practiceResult.feedback}</p>
                    {practiceResult.improved_answer && (
                      <p style={{ marginTop: "1rem", color: 'var(--text-main)' }}>
                        <b>Better Answer:</b> {practiceResult.improved_answer}
                      </p>
                    )}
                    {!practiceResult.correct && (
                      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#8b5cf6", fontWeight: "bold" }}>
                        ✨ The AI will adapt and re-teach this concept in a different learning style!
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Feedback Block */}
            {topic && !loading && lessonHistory.length > 0 && (
              <div className="card">
                <h2>Help the AI adapt to you</h2>
                <textarea
                  className="feedback-input"
                  placeholder="What confused you? How can I teach this better?"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
                <div className="feedback-buttons" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  <button onClick={() => handleFeedback("good")} disabled={feedbackSending || loading}>Got it 👍</button>
                  <button onClick={() => handleFeedback("bad")} disabled={feedbackSending || loading}>Still confused 😕</button>
                  <button className="primary-btn" onClick={() => handleFeedback("custom")} disabled={feedbackSending || loading}>
                    {feedbackSending ? "Sending..." : "Send Note"}
                  </button>
                  {practiceResult && !practiceResult.correct ? (
                    <button className="next primary-btn" onClick={gotonext} disabled={feedbackSending || loading} style={{ background: "#8b5cf6", borderColor: "#8b5cf6" }}>
                      Re-learn Concept ✨
                    </button>
                  ) : (
                    <button className="next primary-btn" onClick={gotonext} disabled={feedbackSending || loading}>Next Step ➡️</button>
                  )}
                </div>
              </div>
            )}
            <div ref={endOfLessonRef} />
          </div>
        )}
        </main>

        {/* RIGHT SIDEBAR FOR JOURNEY */}
        <aside className="right-journey-sidebar">
          <h3 className="journey-title">Your Journey</h3>
          {history.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No past lessons yet.
            </p>
          ) : (
            <ul className="journey-list">
              {history.map((item, idx) => (
                <li
                  key={idx}
                  className={`journey-item ${item.topic === topic ? "active" : ""}`}
                  onClick={() => navigate(`/learn/${item.topic}`)}
                >
                  <span className="journey-topic">{item.topic}</span>
                  <span className="journey-level">{item.detail_level}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

export default Learn;