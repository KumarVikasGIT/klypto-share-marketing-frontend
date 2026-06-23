import re

with open("src/components/tradingModals/OptionChain.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add hoveredRow state
content = content.replace("const [hoveredCell, setHoveredCell] = useState(null);", "const [hoveredCell, setHoveredCell] = useState(null);\n  const [hoveredRow, setHoveredRow] = useState(null);")

# 2. Update callBg and putBg logic
old_bg = """
                const callBg = isCallItm
                  ? "rgba(255,235,59,0.05)"
                  : "transparent";
                const putBg = isPutItm
                  ? "rgba(255,235,59,0.05)"
                  : "transparent";"""
new_bg = """
                let callBg = isCallItm ? "rgba(255,235,59,0.05)" : "transparent";
                let putBg = isPutItm ? "rgba(255,235,59,0.05)" : "transparent";

                if (hoveredRow === strike) {
                  callBg = isCallItm ? "rgba(255,235,59,0.12)" : "rgba(255,255,255,0.08)";
                  putBg = isPutItm ? "rgba(255,235,59,0.12)" : "rgba(255,255,255,0.08)";
                }

                const ceProps = {
                  onMouseEnter: () => { setHoveredCell(`${strike}-CE`); setHoveredRow(strike); },
                  onMouseLeave: () => { setHoveredCell(null); setHoveredRow(null); }
                };
                const peProps = {
                  onMouseEnter: () => { setHoveredCell(`${strike}-PE`); setHoveredRow(strike); },
                  onMouseLeave: () => { setHoveredCell(null); setHoveredRow(null); }
                };"""
content = content.replace(old_bg, new_bg)

# 3. Add {...ceProps} to CE cells
content = content.replace('<td style={{ padding: "12px", background: callBg }}>', '<td {...ceProps} style={{ padding: "12px", background: callBg }}>')
content = content.replace('''<td
                          style={{
                            padding: "12px",
                            background: callBg,
                            color: "#f23645",
                          }}
                        >''', '''<td
                          {...ceProps}
                          style={{
                            padding: "12px",
                            background: callBg,
                            color: "#f23645",
                          }}
                        >''')
content = content.replace('''<td
                      style={{
                        padding: "12px",
                        background: callBg,
                        color: "#f23645",
                      }}
                    >''', '''<td
                      {...ceProps}
                      style={{
                        padding: "12px",
                        background: callBg,
                        color: "#f23645",
                      }}
                    >''')

# 4. Remove onMouseEnter / onMouseLeave from LTP CE cells and use {...ceProps}
content = content.replace('''<td
                          onMouseEnter={() => setHoveredCell(`${strike}-CE`)}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{
                            padding: "12px",
                            background: callBg,
                            borderRight: "1px solid #2a2e39",
                            position: "relative"
                          }}
                        >''', '''<td
                          {...ceProps}
                          style={{
                            padding: "12px",
                            background: callBg,
                            borderRight: "1px solid #2a2e39",
                            position: "relative"
                          }}
                        >''')
content = content.replace('''<td
                      onMouseEnter={() => setHoveredCell(`${strike}-CE`)}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{
                        padding: "12px",
                        background: callBg,
                        borderRight: "1px solid #2a2e39",
                        position: "relative"
                      }}
                    >''', '''<td
                      {...ceProps}
                      style={{
                        padding: "12px",
                        background: callBg,
                        borderRight: "1px solid #2a2e39",
                        position: "relative"
                      }}
                    >''')

# 5. Add {...peProps} to PE cells
content = content.replace('<td style={{ padding: "12px", background: putBg }}>', '<td {...peProps} style={{ padding: "12px", background: putBg }}>')
content = content.replace('''<td
                          style={{
                            padding: "12px",
                            background: putBg,
                            color: "#089981",
                          }}
                        >''', '''<td
                          {...peProps}
                          style={{
                            padding: "12px",
                            background: putBg,
                            color: "#089981",
                          }}
                        >''')
content = content.replace('''<td
                      style={{
                        padding: "12px",
                        background: putBg,
                        color: "#089981",
                      }}
                    >''', '''<td
                      {...peProps}
                      style={{
                        padding: "12px",
                        background: putBg,
                        color: "#089981",
                      }}
                    >''')

# 6. Remove onMouseEnter / onMouseLeave from LTP PE cells and use {...peProps}
content = content.replace('''<td 
                          onMouseEnter={() => setHoveredCell(`${strike}-PE`)}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{ padding: "12px", background: putBg, position: "relative" }}
                        >''', '''<td 
                          {...peProps}
                          style={{ padding: "12px", background: putBg, position: "relative" }}
                        >''')
content = content.replace('''<td 
                      onMouseEnter={() => setHoveredCell(`${strike}-PE`)}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{ padding: "12px", background: putBg, position: "relative" }}
                    >''', '''<td 
                      {...peProps}
                      style={{ padding: "12px", background: putBg, position: "relative" }}
                    >''')

# 7. Add row hover state to the Strike cells so row highlights even if we hover middle
content = content.replace('''<td
                          style={{
                            padding: "12px",
                            fontWeight: "bold",
                            borderRight: "1px solid #2a2e39",
                            background: "#1e222d",
                            color: "#089981",
                          }}
                        >''', '''<td
                          onMouseEnter={() => setHoveredRow(strike)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            padding: "12px",
                            fontWeight: "bold",
                            borderRight: "1px solid #2a2e39",
                            background: "#1e222d",
                            color: "#089981",
                          }}
                        >''')
content = content.replace('''<td
                      style={{
                        padding: "12px",
                        fontWeight: "bold",
                        borderRight: "1px solid #2a2e39",
                        background: "#1e222d",
                      }}
                    >''', '''<td
                      onMouseEnter={() => setHoveredRow(strike)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        padding: "12px",
                        fontWeight: "bold",
                        borderRight: "1px solid #2a2e39",
                        background: "#1e222d",
                      }}
                    >''')

with open("src/components/tradingModals/OptionChain.jsx", "w", encoding="utf-8") as f:
    f.write(content)
