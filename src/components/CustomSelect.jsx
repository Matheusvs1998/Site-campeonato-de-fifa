import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTeamLogo } from '../teamLogos';

// Ícones animados das plataformas
const PlatformIcon = ({ platform }) => {
    if (platform === 'PS5' || platform === 'PS4' || platform === 'PlayStation') {
        return (
            <svg width="24" height="24" viewBox="0 0 200 155" fill="#FFFFFF">
                <path fillRule="evenodd" d="m 197.23914,117.96194 c -3.8677,4.8796 -13.34356,8.36053 -13.34356,8.36053 0,0 -70.49109,25.31994 -70.49109,25.31994 0,0 0,-18.67289 0,-18.67289 0,0 51.87665,-18.48401 51.87665,-18.48401 5.887,-2.10924 6.79096,-5.09097 2.00581,-6.65604 -4.77616,-1.56957 -13.42451,-1.11983 -19.31601,0.99841 0,0 -34.56645,12.17426 -34.56645,12.17426 0,0 0,-19.37898 0,-19.37898 0,0 1.99232,-0.6746 1.99232,-0.6746 0,0 9.98856,-3.534896 24.03371,-5.09097 14.04515,-1.547081 31.24291,0.211374 44.74389,5.32933 15.21445,4.80764 16.92793,11.89543 13.06473,16.77502 z M 120.11451,86.165853 c 0,0 0,-47.752601 0,-47.752601 0,-5.608163 -1.03439,-10.771093 -6.29626,-12.232725 -4.0296,-1.290734 -6.53012,2.45104 -6.53012,8.054706 0,0 0,119.583887 0,119.583887 0,0 -32.250314,-10.23591 -32.250314,-10.23591 0,0 0,-142.58321 0,-142.58321 13.712343,2.54549 33.689454,8.56291 44.429074,12.18326 27.31226,9.376917 36.57225,21.047482 36.57225,47.343343 0,25.630256 -15.82159,35.344478 -35.92463,25.63925 z M 15.862004,131.01768 C 0.24279269,126.6193 -2.3566614,117.45375 4.7626047,112.17389 c 6.5795883,-4.8751 17.7689333,-8.54492 17.7689333,-8.54492 0,0 46.241498,-16.442224 46.241498,-16.442224 0,0 0,18.744854 0,18.744854 0,0 -33.275709,11.90892 -33.275709,11.90892 -5.878004,2.10924 -6.781967,5.09547 -2.005807,6.66054 4.780657,1.56506 13.433512,1.11983 19.320511,-0.99391 0,0 15.961005,-5.79256 15.961005,-5.79256 0,0 0,16.77053 0,16.77053 -1.011893,0.17989 -2.140724,0.35978 -3.184104,0.53518 -15.965505,2.60845 -32.969893,1.5201 -49.726928,-4.00262 z" />
            </svg>
        );
    }
    if (platform === 'Xbox Series X/S' || platform === 'Xbox' || platform === 'Xbox One') {
        return (
            <svg width="24" height="24" viewBox="0 0 88 88" style={{ animation: 'icon-pulse 3s infinite' }}>
                <circle cx="44" cy="44" r="44" fill="#FFFFFF" />
                <path fill="#107C10" d="M39.73 86.91c-6.628-.635-13.338-3.015-19.102-6.776-4.83-3.15-5.92-4.447-5.92-7.032 0-5.193 5.71-14.29 15.48-24.658 5.547-5.89 13.275-12.79 14.11-12.604 1.626.363 14.616 13.034 19.48 19 7.69 9.43 11.224 17.154 9.428 20.597-1.365 2.617-9.837 7.733-16.06 9.698-5.13 1.62-11.867 2.306-17.416 1.775zM8.184 67.703c-4.014-6.158-6.042-12.22-7.02-20.988-.324-2.895-.21-4.55.733-10.494 1.173-7.4 5.39-15.97 10.46-21.24 2.158-2.24 2.35-2.3 4.982-1.41 3.19 1.08 6.6 3.436 11.89 8.22l3.09 2.794-1.69 2.07c-7.828 9.61-16.09 23.24-19.2 31.67-1.69 4.58-2.37 9.18-1.64 11.095.49 1.294.04.812-1.61-1.714zm70.453 1.047c.397-1.936-.105-5.49-1.28-9.076-2.545-7.765-11.054-22.21-18.867-32.032l-2.46-3.092 2.662-2.443c3.474-3.19 5.886-5.1 8.49-6.723 2.053-1.28 4.988-2.413 6.25-2.413.777 0 3.516 2.85 5.726 5.95 3.424 4.8 5.942 10.63 7.218 16.69.825 3.92.894 12.3.133 16.21-.63 3.208-1.95 7.366-3.23 10.187-.97 2.113-3.36 6.218-4.41 7.554-.54.687-.54.686-.24-.796zM40.44 11.505C36.834 9.675 31.272 7.71 28.2 7.18c-1.076-.185-2.913-.29-4.08-.23-2.536.128-2.423-.004 1.643-1.925 3.38-1.597 6.2-2.536 10.03-3.34C40.098.78 48.193.77 52.43 1.663c4.575.965 9.964 2.97 13 4.84l.904.554-2.07-.104C60.148 6.745 54.15 8.408 47.71 11.54c-1.942.946-3.63 1.7-3.754 1.68-.123-.024-1.706-.795-3.52-1.715z"/>
            </svg>
        );
    }
    if (platform === 'PC') {
        return (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'icon-pulse 3s infinite' }}>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
        );
    }
    return null;
};

function CustomSelect({ options, value, onChange, placeholder, isTeam = false, isPlatform = false, isRole = false, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    const [dropdownStyle, setDropdownStyle] = useState({});

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                if (event.target.closest('.custom-select-dropdown')) return;
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: 'fixed',
                top: `${rect.bottom}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                background: '#151119', 
                border: '1px solid rgba(229, 180, 170, .15)', 
                borderTop: '2px solid #e23845', 
                zIndex: 9999, 
                maxHeight: '250px', 
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)', 
                borderBottomLeftRadius: '8px', 
                borderBottomRightRadius: '8px'
            });
        }
        
        const handleScroll = (e) => {
            if (e.target.closest('.custom-select-dropdown')) return;
            setIsOpen(false);
        };
        
        if (isOpen) {
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleScroll);
        }
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const selectedOption = options.find(o => o.value === value);

    const renderOption = (opt, isHeader = false) => {
        if (isRole) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`role-text-anim role-${opt.value}`} style={{ fontSize: isHeader ? '14px' : '13px' }}>
                        {opt.label || opt.value}
                    </span>
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isTeam && (
                    <img src={getTeamLogo(opt.value)} alt={opt.value} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                )}
                {isPlatform && <PlatformIcon platform={opt.value} />}
                <span style={{ color: isHeader ? '#f2e9e2' : '#f2e9e2', fontWeight: isHeader ? 'bold' : 'normal' }}>{opt.label || opt.value}</span>
            </div>
        );
    };

    // Group options for teams
    let groups = {};
    if (isTeam) {
        options.forEach(opt => {
            if (!groups[opt.group]) groups[opt.group] = [];
            groups[opt.group].push(opt);
        });
    }

    return (
        <div className="custom-select-wrapper" ref={wrapperRef} style={{ position: 'relative', width: '100%', opacity: disabled ? 0.5 : 1 }}>
            <div 
                className="gc-field custom-select-header"
                onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
                style={{ 
                    cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '8px 2px', minHeight: '38px', userSelect: 'none',
                    borderBottomColor: isOpen ? '#e23845' : 'rgba(229, 180, 170, .28)'
                }}
            >
                {selectedOption ? renderOption(selectedOption, true) : <span style={{color: 'rgba(242, 233, 226, .32)'}}>{placeholder}</span>}
                <span style={{ fontSize: '10px', color: '#e23845', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>▼</span>
            </div>
            
            {isOpen && createPortal(
                <div className="custom-select-dropdown" style={dropdownStyle}>
                    {isTeam ? (
                        Object.keys(groups).map((groupName, i) => (
                            <div key={i}>
                                <div style={{ 
                                    padding: '6px 12px', fontSize: '11px', textTransform: 'uppercase', 
                                    letterSpacing: '0.1em', color: 'rgba(229, 180, 170, .5)', 
                                    fontFamily: 'Barlow Condensed, sans-serif', background: 'rgba(0,0,0,0.2)',
                                    fontWeight: 'bold'
                                }}>
                                    {groupName}
                                </div>
                                {groups[groupName].map((opt, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                        className="custom-select-option"
                                        style={{ 
                                            padding: '10px 15px', cursor: 'pointer', display: 'flex', 
                                            alignItems: 'center', transition: 'background 0.2s',
                                            background: opt.value === value ? 'rgba(226, 56, 69, 0.15)' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = opt.value === value ? 'rgba(226, 56, 69, 0.15)' : 'transparent'}
                                    >
                                        {renderOption(opt)}
                                    </div>
                                ))}
                            </div>
                        ))
                    ) : (
                        options.map((opt, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className="custom-select-option"
                                style={{ 
                                    padding: '12px 15px', cursor: 'pointer', display: 'flex', 
                                    alignItems: 'center', transition: 'background 0.2s',
                                    background: opt.value === value ? 'rgba(226, 56, 69, 0.15)' : 'transparent'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = opt.value === value ? 'rgba(226, 56, 69, 0.15)' : 'transparent'}
                            >
                                {renderOption(opt)}
                            </div>
                        ))
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}

export default CustomSelect;
