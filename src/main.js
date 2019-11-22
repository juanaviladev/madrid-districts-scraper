const JSDOM = require("jsdom").JSDOM;
const fs = require('fs');

const DISTRICTS_TABLE = "district";
const POSTAL_CODES_TABLE = "district_postal_code";

function findFirstParent(district,tagName) {
    if(!district) return undefined;
    else if(district.tagName.toUpperCase() === tagName.toUpperCase()) return district;
    else return findFirstParent(district.parentElement,tagName);
}

async function main() {
    let page = await JSDOM.fromURL('');
    const dom = page.window.document;

    let districts = dom.querySelectorAll('span.Estilo16,span.Estilo18');

    let data = [];
    for(const district of districts) {
        let postalCodesNode = searchByInnerText(
            'Correos y Telégrafos',
            findFirstParent(district,"tr").nextElementSibling
        );

        let districtName = district.textContent;

        let trWithTable = findFirstParent(postalCodesNode,"tr").nextElementSibling.children[0];
        let postalCodeRows = Array.from(trWithTable.querySelectorAll("tr > td:first-child"));

        let postalCodes = postalCodeRows.map(p => p.textContent);

        data.push({"district":districtName,postalCodes});

    }


    let districtsSql = data.map((d,id) => `INSERT INTO ${DISTRICTS_TABLE} (id,name) VALUES (${id+1},'${d.district}');`);
    let postalCodesSql = data.map((d,id) => d.postalCodes.map(postalCode => `INSERT INTO ${POSTAL_CODES_TABLE} (district_id,postal_code) VALUES (${id+1},${postalCode});`)).flatten();

    let districtsTableDropStatement = `DROP TABLE IF EXISTS ${DISTRICTS_TABLE};`;
    let postalCodesTableDropStatement = `DROP TABLE IF EXISTS ${POSTAL_CODES_TABLE};`;

    let districtsTableStatement = `CREATE TABLE ${DISTRICTS_TABLE} (id INTEGER AUTO_INCREMENT, name VARCHAR(255) NOT NULL, PRIMARY KEY (id) );`;
    let postalCodesTableStatement = `CREATE TABLE ${POSTAL_CODES_TABLE} (district_id INTEGER NOT NULL, postal_code INTEGER NOT NULL, PRIMARY KEY (postal_code,district_id) );`;

    let allStatements = districtsSql.concat(postalCodesSql).join("\n");

    const fos = fs.createWriteStream('data.sql');
    fos.write(districtsTableDropStatement);
    fos.write('\n');
    fos.write(postalCodesTableDropStatement);
    fos.write('\n');
    fos.write(districtsTableStatement);
    fos.write('\n');
    fos.write(postalCodesTableStatement);
    fos.write('\n');
    fos.write(allStatements);
    fos.end();

    console.log("📜 Sql file created");
}


Array.prototype.flatten = function () {

    function recursive(arr) {
        return arr.reduce(function (flat, toFlatten) {
            return flat.concat(Array.isArray(toFlatten) ? recursive(toFlatten) : toFlatten);
        }, []);
    }

    return recursive(this);

};

function searchByInnerText(text, node) {
    let children = node.children;
    for(const child of children) {
        let result = searchByInnerText(text,child);
        if(result) return result;
    }
    if(node.textContent && node.textContent.includes(text)) return node;
    else return undefined;
}

main();
