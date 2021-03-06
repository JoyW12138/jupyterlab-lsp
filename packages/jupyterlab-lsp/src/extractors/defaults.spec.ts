import { IVirtualDocumentBlock, VirtualDocument } from '../virtual/document';
import { expect } from 'chai';
import { foreign_code_extractors } from './defaults';
import { CodeEditor } from '@jupyterlab/codeeditor';

function wrap_in_python_lines(line: string) {
  return 'print("some code before")\n' + line + '\n' + 'print("and after")\n';
}

describe('Default extractors', () => {
  let document: VirtualDocument;

  function extract(code: string) {
    return document.extract_foreign_code(code, null, {
      line: 0,
      column: 0
    });
  }

  function get_the_only_virtual(
    foreign_document_map: Map<CodeEditor.IRange, IVirtualDocumentBlock>
  ) {
    expect(foreign_document_map.size).to.equal(1);

    let { virtual_document } = foreign_document_map.get(
      foreign_document_map.keys().next().value
    );

    return virtual_document;
  }

  beforeEach(() => {
    document = new VirtualDocument(
      'python',
      'test.ipynb',
      {},
      foreign_code_extractors,
      false,
      'py',
      false
    );
  });

  afterEach(() => {
    document.clear();
  });

  describe('%R line magic', () => {
    it('extracts simple commands', () => {
      let code = wrap_in_python_lines('%R ggplot()');
      let { cell_code_kept, foreign_document_map } = extract(code);

      // should not be removed, but left for the static analysis (using magic overrides)
      expect(cell_code_kept).to.equal(code);
      let r_document = get_the_only_virtual(foreign_document_map);
      expect(r_document.language).to.equal('r');
      expect(r_document.value).to.equal('ggplot()\n');
    });

    it('parses input (into a dummy data frame)', () => {
      let code = wrap_in_python_lines('%R -i df ggplot(df)');
      let { foreign_document_map } = extract(code);

      let r_document = get_the_only_virtual(foreign_document_map);
      expect(r_document.language).to.equal('r');
      expect(r_document.value).to.equal('df <- data.frame()\nggplot(df)\n');
    });

    it('parses multiple inputs (into dummy data frames)', () => {
      let code = wrap_in_python_lines('%R -i df -i x ggplot(df)');
      let r_document = get_the_only_virtual(extract(code).foreign_document_map);
      expect(r_document.value).to.equal(
        'df <- data.frame()\n' + 'x <- data.frame()\n' + 'ggplot(df)\n'
      );
    });

    it('parses inputs ignoring other arguments', () => {
      let code = wrap_in_python_lines('%R -i df --width 300 -o x ggplot(df)');
      let r_document = get_the_only_virtual(extract(code).foreign_document_map);
      expect(r_document.value).to.equal(
        'df <- data.frame()\n' + 'ggplot(df)\n'
      );
    });
  });

  describe('%%R cell magic', () => {
    it('extracts simple commands', () => {
      let code = '%%R\nggplot()';
      let { cell_code_kept, foreign_document_map } = extract(code);

      expect(cell_code_kept).to.equal(code);
      let r_document = get_the_only_virtual(foreign_document_map);
      expect(r_document.language).to.equal('r');
      expect(r_document.value).to.equal('ggplot()\n');
    });
  });

  it('parses input (into a dummy data frame)', () => {
    let code = '%%R -i df\nggplot(df)';
    let { foreign_document_map } = extract(code);

    let r_document = get_the_only_virtual(foreign_document_map);
    expect(r_document.language).to.equal('r');
    expect(r_document.value).to.equal('df <- data.frame()\nggplot(df)\n');
  });
});
