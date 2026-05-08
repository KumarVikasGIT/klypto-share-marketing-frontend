import React, { useState } from "react";
import { FiX, FiPlus, FiMoreHorizontal, FiTrash2, FiMaximize2 } from "react-icons/fi";
import { BsGrid } from "react-icons/bs";
import { AiOutlineEdit } from "react-icons/ai";
import { ListingModal } from "../tradingModals/ListingModal";

const LeftDetail = ({ onClose, selectedCurrency, detailsList, onAddStock, onRemoveStock, setSelectedCurrency }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 60px)",
      background: "#131722",
      color: "#d1d4dc",
      borderRight: "1px solid #2a2e39",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      borderBottom: "1px solid #2a2e39",
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontWeight: "600",
      fontSize: "0.95rem",
    },
    headerIcons: {
      display: "flex",
      gap: "12px",
      color: "#787b86",
      cursor: "pointer",
      alignItems: "center",
    },
    subHeader: {
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "0.7rem",
      color: "#787b86",
      textTransform: "uppercase",
      borderBottom: "1px solid #2a2e39",
    },
    listContainer: {
      flex: 1,
      overflowY: "auto",
    },
    listItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 16px",
      borderBottom: "1px solid #1e222d",
      cursor: "pointer",
    },
    stockName: {
      fontWeight: "600",
      fontSize: "0.85rem",
      color: "#d1d4dc",
    },
    stockPrice: {
      fontSize: "0.85rem",
      fontWeight: "600",
    },
    stockChange: {
      fontSize: "0.75rem",
    },
    footer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      borderTop: "1px solid #2a2e39",
      background: "#1e222d",
    },
    footerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "0.9rem",
      fontWeight: "600",
      color: "#d1d4dc",
    },
    footerIcons: {
      display: "flex",
      gap: "16px",
      color: "#787b86",
      cursor: "pointer",
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    modalContent: {
        background: '#1e222d',
        padding: '20px',
        borderRadius: '8px',
        width: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        color: '#d1d4dc',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #2a2e39',
        paddingBottom: '10px',
    },
    stockRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        borderBottom: '1px solid #2a2e39',
    },
    btnContainer: {
        display: 'flex',
        gap: '8px',
    },
    addBtn: {
        background: '#2962ff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.75rem',
        cursor: 'pointer',
    },
    deleteBtn: {
        background: '#f23645',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.75rem',
        cursor: 'pointer',
    }
  };

  const handleAddStock = (stock) => {
    onAddStock(stock);
  };

  const handleDeleteStock = (symbol) => {
    onRemoveStock(symbol);
  };

  return (
    <div style={styles.container}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #131722; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 4px; }
      `}</style>
      
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          Details <span style={{fontSize: '0.8rem', color: '#787b86', marginLeft: '4px'}}>▼</span>
        </div>
        <div style={styles.headerIcons}>
          <FiPlus onClick={() => setIsModalOpen(true)} />
          <FiMaximize2 size={14} />
          <FiX onClick={onClose} />
          <FiMoreHorizontal />
        </div>
      </div>

      <div style={styles.subHeader}>
        <span>Symbol</span>
        <div style={{display: 'flex', gap: '20px'}}>
          {/* <span>Last</span> */}
          <span>Chg</span>
          <span>Chg%</span>
        </div>
      </div>

      <div className="custom-scrollbar" style={styles.listContainer}>
        {detailsList.map((stock, idx) => {
          console.log(stock);
          // Formula: change = high - low, percent_change = ((high - low) / low) * 100
          const high = parseFloat(stock.high || 0);
          const low = parseFloat(stock.low || 0);
          const calculatedChange = high - low;
          const calculatedPercentChange = low !== 0 ? (calculatedChange / low) * 100 : 0;
          
          const isPositive = calculatedChange >= 0;
          const color = isPositive ? "#22ab94" : "#f23645";

          return (
            <div 
              key={idx} 
              style={styles.listItem}
              onClick={() => setSelectedCurrency(stock)}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div style={{
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: idx % 2 === 0 ? '#2962ff' : '#1e222d',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 'bold'
                }}>
                  {stock.name ? stock.name.substring(0, 1) : "S"}
                </div>
                <div style={styles.stockName}>{stock.name}</div>
              </div>
              <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                {/* <div style={{...styles.stockPrice, color: stock.ltp ? color : '#d1d4dc'}}>{stock.ltp || '--'}</div> */}
                <div style={{...styles.stockChange, color}}>{calculatedChange.toFixed(2)}</div>
                <div style={{...styles.stockChange, color}}>{`${calculatedPercentChange.toFixed(2)}%`}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerLeft}>
           <div style={{
             width: '24px', 
             height: '24px', 
             borderRadius: '50%', 
             background: '#2962ff',
             display: 'flex',
             justifyContent: 'center',
             alignItems: 'center'
           }}>
             <span style={{fontSize: '0.8rem'}}>D</span>
           </div>
           {selectedCurrency?.name || "STOCK"}
        </div>
        <div style={styles.footerIcons}>
          <BsGrid />
          <AiOutlineEdit />
          <FiMoreHorizontal />
        </div>
      </div>

      {isModalOpen && (
        <ListingModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          title="Symbol Search"
          setSelectedCurrency={setSelectedCurrency}
          renderActions={(stock) => {
            const isAdded = detailsList.some(s => s.symbol === stock.symbol);
            return (
              <div style={styles.btnContainer}>
                {!isAdded ? (
                  <button 
                      style={styles.addBtn}
                      onClick={(e) => {
                          e.stopPropagation();
                          handleAddStock(stock);
                      }}
                  >
                      Add
                  </button>
                ) : (
                  <button 
                      style={styles.deleteBtn}
                      onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStock(stock.symbol);
                      }}
                  >
                      Delete
                  </button>
                )}
              </div>
            );
          }}
        />
      )}
    </div>
  );
};

export default LeftDetail;
