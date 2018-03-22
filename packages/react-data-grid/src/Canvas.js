const React = require('react');
import PropTypes from 'prop-types';
const Row = require('./Row');
const cellMetaDataShape = require('./PropTypeShapes/CellMetaDataShape');
require('../../../themes/react-data-grid-core.css');
import RowsContainer from './RowsContainer';
import RowGroup from './RowGroup';
import MasksContainer from './connectedComponents/MasksContainer';

class Canvas extends React.Component {
  static displayName = 'Canvas';

  static propTypes = {
    rowRenderer: PropTypes.oneOfType([PropTypes.func, PropTypes.element]),
    rowHeight: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    width: PropTypes.number,
    totalWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    style: PropTypes.string,
    className: PropTypes.string,
    displayStart: PropTypes.number.isRequired,
    displayEnd: PropTypes.number.isRequired,
    visibleStart: PropTypes.number.isRequired,
    visibleEnd: PropTypes.number.isRequired,
    colVisibleStart: PropTypes.number.isRequired,
    colVisibleEnd: PropTypes.number.isRequired,
    colDisplayStart: PropTypes.number.isRequired,
    colDisplayEnd: PropTypes.number.isRequired,
    rowsCount: PropTypes.number.isRequired,
    rowGetter: PropTypes.oneOfType([
      PropTypes.func.isRequired,
      PropTypes.array.isRequired
    ]),
    expandedRows: PropTypes.array,
    onRows: PropTypes.func,
    onScroll: PropTypes.func,
    columns: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
    cellMetaData: PropTypes.shape(cellMetaDataShape).isRequired,
    selectedRows: PropTypes.array,
    rowKey: PropTypes.string,
    rowScrollTimeout: PropTypes.number,
    scrollToRowIndex: PropTypes.number,
    contextMenu: PropTypes.element,
    getSubRowDetails: PropTypes.func,
    rowSelection: PropTypes.oneOfType([
      PropTypes.shape({
        indexes: PropTypes.arrayOf(PropTypes.number).isRequired
      }),
      PropTypes.shape({
        isSelectedKey: PropTypes.string.isRequired
      }),
      PropTypes.shape({
        keys: PropTypes.shape({
          values: PropTypes.array.isRequired,
          rowKey: PropTypes.string.isRequired
        }).isRequired
      })
    ]),
    rowGroupRenderer: PropTypes.func,
    isScrolling: PropTypes.bool,
    length: PropTypes.number
  };

  static defaultProps = {
    rowRenderer: Row,
    onRows: () => { },
    selectedRows: [],
    rowScrollTimeout: 0
  };

  state = {
    displayStart: this.props.displayStart,
    displayEnd: this.props.displayEnd,
    scrollingTimeout: null
  };

  _currentRowsLength = 0;
  _currentRowsRange = { start: 0, end: 0 };
  _scroll = { scrollTop: 0, scrollLeft: 0 };

  componentWillMount() {
    this.rows = [];
    this._currentRowsLength = 0;
    this._currentRowsRange = { start: 0, end: 0 };
    this._scroll = { scrollTop: 0, scrollLeft: 0 };
  }

  componentDidMount() {
    this.onRows();
  }

  componentWillReceiveProps(nextProps: any) {
    if (nextProps.displayStart !== this.state.displayStart
      || nextProps.displayEnd !== this.state.displayEnd) {
      this.setState({
        displayStart: nextProps.displayStart,
        displayEnd: nextProps.displayEnd
      });
    }
  }

  componentWillUnmount() {
    this._currentRowsLength = 0;
    this._currentRowsRange = { start: 0, end: 0 };
    this._scroll = { scrollTop: 0, scrollLeft: 0 };
  }

  componentDidUpdate() {
    if (this._scroll.scrollTop !== 0 && this._scroll.scrollLeft !== 0) {
      this.setScrollLeft(this._scroll.scrollLeft);
    }
    if (this.props.scrollToRowIndex !== 0) {
      this.canvas.scrollTop = Math.min(
        this.props.scrollToRowIndex * this.props.rowHeight,
        this.props.rowsCount * this.props.rowHeight - this.props.height
      );
    }
    this.onRows();
  }

  onRows = () => {
    if (this._currentRowsRange !== { start: 0, end: 0 }) {
      this.props.onRows(this._currentRowsRange);
      this._currentRowsRange = { start: 0, end: 0 };
    }
  };

  onScroll = (e: any) => {
    if (this.canvas !== e.target) {
      return;
    }
    let scrollLeft = e.target.scrollLeft;
    let scrollTop = e.target.scrollTop;
    let scroll = { scrollTop, scrollLeft };
    this._scroll = scroll;
    this.props.onScroll(scroll);
  };

  getClientScrollTopOffset(node) {
    const { rowHeight} = this.props;
    const scrollVariation = node.scrollTop % rowHeight;
    return scrollVariation > 0 ? rowHeight - scrollVariation : 0;
  }

  onHitBottomCanvas = () =>  {
    const { rowHeight} = this.props;
    const node = ReactDOM.findDOMNode(this);
    node.scrollTop += rowHeight + this.getClientScrollTopOffset(node);
  }

  onHitTopCanvas = () =>  {
    const {rowHeight} = this.props;
    const node = ReactDOM.findDOMNode(this);
    node.scrollTop -= (rowHeight - this.getClientScrollTopOffset(node));
  }

  onHitLeftCanvas = () =>  {
    const {rowHeight} = this.props;
    const node = ReactDOM.findDOMNode(this);
    node.scrollTop -= rowHeight;
  }

  onHitRightCanvas = () =>  {
    const {colVisibleEnd, rowHeight} = this.props;
    const node = ReactDOM.findDOMNode(this);
    node.scrollLeft -= (colVisibleEnd - visibleStart) * rowHeight;
  }

  getRows = (displayStart, displayEnd) => {
    this._currentRowsRange = { start: displayStart, end: displayEnd };
    if (Array.isArray(this.props.rowGetter)) {
      return this.props.rowGetter.slice(displayStart, displayEnd);
    }
    let rows = [];
    let i = displayStart;
    while (i < displayEnd) {
      let row = this.props.rowGetter(i);
      let subRowDetails = {};
      if (this.props.getSubRowDetails) {
        subRowDetails = this.props.getSubRowDetails(row);
      }
      rows.push({ row, subRowDetails });
      i++;
    }
    return rows;
  };

  getScrollbarWidth = () => {
    // Get the scrollbar width
    const scrollbarWidth = this.canvas.offsetWidth - this.canvas.clientWidth;
    return scrollbarWidth;
  };

  getScroll = () => {
    const { scrollTop, scrollLeft } = this.canvas;
    return { scrollTop, scrollLeft };
  };

  isRowSelected = (idx, row) => {
    // Use selectedRows if set
    if (this.props.selectedRows !== null) {
      let selectedRows = this.props.selectedRows.filter(r => {
        let rowKeyValue = row.get ? row.get(this.props.rowKey) : row[this.props.rowKey];
        return r[this.props.rowKey] === rowKeyValue;
      });
      return selectedRows.length > 0 && selectedRows[0].isSelected;
    }

    // Else use new rowSelection props
    if (this.props.rowSelection) {
      let { keys, indexes, isSelectedKey } = this.props.rowSelection;
      return RowUtils.isRowSelected(keys, indexes, isSelectedKey, row, idx);
    }

    return false;
  };

  setScrollLeft = (scrollLeft) => {
    if (this._currentRowsLength !== 0) {
      if (!this.rows) return;
      for (let i = 0, len = this._currentRowsLength; i < len; i++) {
        if (this.rows[i]) {
          let row = this.getRowByRef(i);
          if (row && row.setScrollLeft) {
            row.setScrollLeft(scrollLeft);
          }
        }
      }
    }
  };

  getRowByRef = (i) => {
    // check if wrapped with React DND drop target
    let wrappedRow = this.rows[i].getDecoratedComponentInstance ? this.rows[i].getDecoratedComponentInstance(i) : null;
    if (wrappedRow) {
      return wrappedRow.row;
    }
    return this.rows[i];
  };

  renderRow = (props: any) => {
    let row = props.row;
    if (row.__metaData && row.__metaData.getRowRenderer) {
      return row.__metaData.getRowRenderer(this.props, props.idx);
    }
    if (row.__metaData && row.__metaData.isGroup) {
      return (<RowGroup
        {...props}
        {...row.__metaData}
        name={row.name}
        renderer={this.props.rowGroupRenderer} />);
    }
    let RowsRenderer = this.props.rowRenderer;
    if (typeof RowsRenderer === 'function') {
      return <RowsRenderer {...props} />;
    }

    if (React.isValidElement(this.props.rowRenderer)) {
      return React.cloneElement(this.props.rowRenderer, props);
    }
  };

  renderPlaceholder = (key: string, height: number) => {
    // just renders empty cells
    // if we wanted to show gridlines, we'd need classes and position as with renderScrollingPlaceholder
    return (<div key={key} style={{ height: height }}>
      {
        this.props.columns.map(
          (column, idx) => <div style={{ width: column.width }} key={idx} />
        )
      }
    </div >
    );
  };

  render() {
    const { displayStart, displayEnd } = this.state;
    const { cellMetaData, columns, colDisplayStart, colDisplayEnd, colVisibleStart, colVisibleEnd, expandedRows, rowHeight, rowsCount, width, height, rowGetter } = this.props;

    let rows = this.getRows(displayStart, displayEnd)
      .map((r, idx) => this.renderRow({
        key: `row-${displayStart + idx}`,
        ref: (node) => this.rows[idx] = node,
        idx: displayStart + idx,
        visibleStart: this.props.visibleStart,
        visibleEnd: this.props.visibleEnd,
        row: r.row,
        height: rowHeight,
        onMouseOver: this.onMouseOver,
        columns: columns,
        isSelected: this.isRowSelected(displayStart + idx, r.row, displayStart, displayEnd),
        expandedRows,
        cellMetaData,
        subRowDetails: r.subRowDetails,
        colVisibleStart,
        colVisibleEnd,
        colDisplayStart,
        colDisplayEnd,
        isScrolling: this.props.isScrolling
      }));

    this._currentRowsLength = rows.length;

    if (displayStart > 0) {
      rows.unshift(this.renderPlaceholder('top', displayStart * rowHeight));
    }

    if (rowsCount - displayEnd > 0) {
      rows.push(
        this.renderPlaceholder('bottom', (rowsCount - displayEnd) * rowHeight));
    }

    let style = {
      position: 'absolute',
      top: 0,
      left: 0,
      overflowX: 'auto',
      overflowY: 'scroll',
      width: this.props.totalWidth,
      height
    };

    return (
        <div
          ref={(div) => { this.canvas = div; }}
          style={style}
          onScroll={this.onScroll}
          className="react-grid-Canvas">
          <MasksContainer
            rowGetter={rowGetter}
            width={this.props.totalWidth}
            height={height}
            rowHeight={rowHeight}
            onCellClick={cellMetaData.onCellClick}
            columns={columns}
            visibleStart={this.props.visibleStart}
            visibleEnd={this.props.visibleEnd}
            colVisibleStart={colVisibleStart}
            colVisibleEnd={colVisibleEnd}
            onHitBottomBoundary={this.onHitBottomCanvas}
            onHitTopBoundary={this.onHitTopCanvas}
            onHitLeftBoundary={this.onHitLeftCanvas}
            onHitRightBoundary={this.onHitRightCanvas}
          />
          <RowsContainer
            width={width}
            rows={rows}
            contextMenu={this.props.contextMenu}
          />
        </div>
    );
  }
}

module.exports = Canvas;
